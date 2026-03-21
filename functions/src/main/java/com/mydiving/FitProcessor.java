package com.mydiving;

import com.garmin.fit.*;
import com.google.cloud.functions.CloudEventsFunction;
import com.google.events.cloud.storage.v1.StorageObjectData;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.cloud.StorageClient;
import com.google.cloud.firestore.Firestore;
import com.google.protobuf.InvalidProtocolBufferException;
import io.cloudevents.CloudEvent;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Cloud Function triggered when a .FIT file is uploaded to Firebase Storage.
 * Decodes the file using the Garmin FIT SDK and saves dive data to Firestore.
 */
public class FitProcessor implements CloudEventsFunction {

    private static final Logger logger = Logger.getLogger(FitProcessor.class.getName());
    private static final String BUCKET_NAME = System.getenv("STORAGE_BUCKET");

    static {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(com.google.auth.oauth2.GoogleCredentials.getApplicationDefault())
                        .setStorageBucket(BUCKET_NAME)
                        .build();
                FirebaseApp.initializeApp(options);
            }
        } catch (IOException e) {
            logger.severe("Failed to initialize Firebase: " + e.getMessage());
        }
    }

    @Override
    public void accept(CloudEvent event) throws InvalidProtocolBufferException {
        // Parse the Storage event to get file info
        StorageObjectData data = StorageObjectData.parseFrom(event.getData().toBytes());
        String filePath = data.getName(); // e.g. "users/uid123/dives/activity.fit"
        String bucket = data.getBucket();

        logger.info("Processing file: " + filePath);

        // Only process .FIT files
        if (!filePath.toLowerCase().endsWith(".fit")) {
            logger.info("Skipping non-FIT file: " + filePath);
            return;
        }

        // Extract userId from path: users/{userId}/dives/{filename}
        String[] parts = filePath.split("/");
        if (parts.length < 4) {
            logger.warning("Unexpected file path format: " + filePath);
            return;
        }
        String userId = parts[1];
        String fileName = parts[parts.length - 1];
        String diveId = fileName.replace(".fit", "").replace(".FIT", "");

        try {
            // Download the .FIT file from Firebase Storage
            byte[] fitData = StorageClient.getInstance()
                    .bucket(bucket)
                    .get(filePath)
                    .getContent();

            // Decode using Garmin FIT SDK
            Map<String, Object> diveData = decodeFitFile(fitData);
            diveData.put("fileName", fileName);
            diveData.put("filePath", filePath);
            diveData.put("processedAt", com.google.cloud.Timestamp.now());

            // Save structured dive data to Firestore under users/{userId}/dives/{diveId}
            Firestore firestore = FirestoreClient.getFirestore();
            firestore.collection("users")
                    .document(userId)
                    .collection("dives")
                    .document(diveId)
                    .set(diveData)
                    .get(); // wait for write to complete

            logger.info("Successfully saved dive data for: " + diveId);

        } catch (Exception e) {
            logger.severe("Failed to process FIT file " + filePath + ": " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    /**
     * Decodes a .FIT file byte array and extracts dive/activity data.
     */
    private Map<String, Object> decodeFitFile(byte[] fitData) {
        Map<String, Object> diveData = new HashMap<>();
        List<Map<String, Object>> records = new ArrayList<>();

        Decode decode = new Decode();
        MesgBroadcaster broadcaster = new MesgBroadcaster(decode);

        // Session message — overall activity summary
        broadcaster.addListener((SessionMesg mesg) -> {
            if (mesg.getSport() != null) {
                diveData.put("sport", mesg.getSport().toString());
            }
            if (mesg.getStartTime() != null) {
                diveData.put("startTime", mesg.getStartTime().getDate().toString());
            }
            if (mesg.getTotalElapsedTime() != null) {
                diveData.put("totalDurationSeconds", mesg.getTotalElapsedTime());
            }
            if (mesg.getTotalDistance() != null) {
                diveData.put("totalDistanceMeters", mesg.getTotalDistance());
            }
        });

        // Dive summary message (for dive computers)
        broadcaster.addListener((DiveSummaryMesg mesg) -> {
            if (mesg.getMaxDepth() != null) {
                diveData.put("maxDepthMeters", mesg.getMaxDepth());
            }
            if (mesg.getAvgDepth() != null) {
                diveData.put("avgDepthMeters", mesg.getAvgDepth());
            }
            if (mesg.getBottomTime() != null) {
                diveData.put("bottomTimeSeconds", mesg.getBottomTime());
            }
        });

        // Record messages — time-series data points
        broadcaster.addListener((RecordMesg mesg) -> {
            Map<String, Object> record = new HashMap<>();
            if (mesg.getTimestamp() != null) {
                record.put("timestamp", mesg.getTimestamp().getDate().toString());
            }
            if (mesg.getDepth() != null) {
                record.put("depthMeters", mesg.getDepth());
            }
            if (mesg.getHeartRate() != null) {
                record.put("heartRateBpm", mesg.getHeartRate());
            }
            if (mesg.getTemperature() != null) {
                record.put("temperatureCelsius", mesg.getTemperature());
            }
            records.add(record);
        });

        try {
            decode.read(new ByteArrayInputStream(fitData), broadcaster, broadcaster);
        } catch (FitRuntimeException e) {
            logger.warning("FIT decode warning: " + e.getMessage());
        }

        diveData.put("records", records);
        return diveData;
    }
}
