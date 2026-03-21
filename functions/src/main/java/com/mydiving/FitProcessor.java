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
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Cloud Function triggered when a .FIT file is uploaded to Firebase Storage.
 * Decodes with Garmin FIT SDK, stores decoded data inside file.data:
 *   file.data.sessionMesg      → sport, startTime, totalElapsedTime
 *   file.data.diveSummaryMesg  → all dive_summary fields (reference_mesg != 19)
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
        StorageObjectData data = StorageObjectData.parseFrom(event.getData().toBytes());
        String filePath = data.getName(); // users/{userId}/dives/{filename}.fit
        String bucket   = data.getBucket();

        logger.info("Processing file: " + filePath);

        if (!filePath.toLowerCase().endsWith(".fit")) {
            logger.info("Skipping non-FIT file: " + filePath);
            return;
        }

        // Path: users/{userId}/dives/{filename}
        String[] parts = filePath.split("/");
        if (parts.length < 4) {
            logger.warning("Unexpected path format: " + filePath);
            return;
        }
        String userId = parts[1];

        // diveId is the UUID stored as custom metadata by the frontend uploader
        String diveId = data.getMetadataMap().get("diveId");
        if (diveId == null || diveId.isEmpty()) {
            logger.warning("No diveId in metadata for: " + filePath);
            return;
        }

        Firestore db = FirestoreClient.getFirestore();

        try {
            // Mark file as processing
            Map<String, Object> processingUpdate = new HashMap<>();
            processingUpdate.put("file.status", "processing");
            db.collection("users").document(userId)
              .collection("dives").document(diveId)
              .update(processingUpdate).get();

            // Download .FIT bytes from Storage
            byte[] fitData = StorageClient.getInstance()
                    .bucket(bucket)
                    .get(filePath)
                    .getContent();

            // Decode — returns { sessionMesg: {...}, diveSummaryMesg: {...} }
            Map<String, Object> decodedData = decodeFitFile(fitData);

            // Write decoded data into file.data and mark as done
            Map<String, Object> finalUpdate = new HashMap<>();
            finalUpdate.put("file.status", "done");
            finalUpdate.put("file.processedAt", com.google.cloud.Timestamp.now());
            finalUpdate.put("file.data", decodedData);

            db.collection("users").document(userId)
              .collection("dives").document(diveId)
              .update(finalUpdate).get();

            logger.info("Successfully processed: " + diveId);

        } catch (Exception e) {
            logger.severe("Failed to process " + filePath + ": " + e.getMessage());
            try {
                Map<String, Object> errorUpdate = new HashMap<>();
                errorUpdate.put("file.status", "error");
                errorUpdate.put("file.errorMessage", e.getMessage());
                db.collection("users").document(userId)
                  .collection("dives").document(diveId)
                  .update(errorUpdate).get();
            } catch (Exception ignored) {}
            throw new RuntimeException(e);
        }
    }

    /**
     * Decodes a .FIT file and returns a map with two nested objects:
     *   sessionMesg:     { sport, startTime, totalElapsedTime }
     *   diveSummaryMesg: { diveNumber, avgDepth, maxDepth, bottomTime,
     *                      surfaceInterval, avgAscentRate, startN2, endN2,
     *                      o2Toxicity, startCns, endCns }
     */
    private Map<String, Object> decodeFitFile(byte[] fitData) {
        Map<String, Object> sessionMesg     = new HashMap<>();
        Map<String, Object> diveSummaryMesg = new HashMap<>();

        Decode decode = new Decode();
        MesgBroadcaster broadcaster = new MesgBroadcaster(decode);

        broadcaster.addListener((SessionMesg mesg) -> {
            if (mesg.getSport()            != null) sessionMesg.put("sport",            mesg.getSport().toString().toLowerCase());
            if (mesg.getStartTime()        != null) sessionMesg.put("startTime",        mesg.getStartTime().getDate().toInstant().toString());
            if (mesg.getTotalElapsedTime() != null) sessionMesg.put("totalElapsedTime", mesg.getTotalElapsedTime());
        });

        broadcaster.addListener((DiveSummaryMesg mesg) -> {
            // Skip the self-referential duplicate (reference_mesg == 19 == DIVE_SUMMARY)
            if (mesg.getReferenceMesg() != null && mesg.getReferenceMesg() == 19) return;

            if (mesg.getDiveNumber()      != null) diveSummaryMesg.put("diveNumber",       mesg.getDiveNumber());
            if (mesg.getAvgDepth()        != null) diveSummaryMesg.put("avgDepth",         mesg.getAvgDepth());
            if (mesg.getMaxDepth()        != null) diveSummaryMesg.put("maxDepth",         mesg.getMaxDepth());
            if (mesg.getBottomTime()      != null) diveSummaryMesg.put("bottomTime",       mesg.getBottomTime());
            if (mesg.getSurfaceInterval() != null) diveSummaryMesg.put("surfaceInterval",  mesg.getSurfaceInterval());
            if (mesg.getAvgAscentRate()   != null) diveSummaryMesg.put("avgAscentRate",    mesg.getAvgAscentRate());
            if (mesg.getStartN2()         != null) diveSummaryMesg.put("startN2",          mesg.getStartN2());
            if (mesg.getEndN2()           != null) diveSummaryMesg.put("endN2",            mesg.getEndN2());
            if (mesg.getO2Toxicity()      != null) diveSummaryMesg.put("o2Toxicity",       mesg.getO2Toxicity());
            if (mesg.getStartCns()        != null) diveSummaryMesg.put("startCns",         mesg.getStartCns());
            if (mesg.getEndCns()          != null) diveSummaryMesg.put("endCns",           mesg.getEndCns());
        });

        try {
            decode.read(new ByteArrayInputStream(fitData), broadcaster);
        } catch (FitRuntimeException e) {
            logger.warning("FIT decode warning: " + e.getMessage());
        }

        Map<String, Object> data = new HashMap<>();
        data.put("sessionMesg",     sessionMesg);
        data.put("diveSummaryMesg", diveSummaryMesg);
        return data;
    }
}

        return planning;
    }
}

/**
 * Cloud Function triggered when a .FIT file is uploaded to Firebase Storage.
 * Decodes the file using the Garmin FIT SDK and merges dive data into Firestore.
 * One document per file, keyed by diveId (filename without extension).
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
        StorageObjectData data = StorageObjectData.parseFrom(event.getData().toBytes());
        String filePath = data.getName(); // users/{userId}/dives/{filename}.fit
        String bucket   = data.getBucket();

        logger.info("Processing file: " + filePath);

        if (!filePath.toLowerCase().endsWith(".fit")) {
            logger.info("Skipping non-FIT file: " + filePath);
            return;
        }

        // Path: users/{userId}/dives/{filename}
        String[] parts = filePath.split("/");
        if (parts.length < 4) {
            logger.warning("Unexpected path format: " + filePath);
            return;
        }
        String userId  = parts[1];
        String fileName = parts[parts.length - 1];
        String diveId  = fileName.replaceAll("(?i)\\.fit$", "");

        Firestore db = FirestoreClient.getFirestore();

        try {
            // Mark as processing
            db.collection("users").document(userId)
              .collection("dives").document(diveId)
              .update("status", "processing").get();

            // Download .FIT bytes from Storage
            byte[] fitData = StorageClient.getInstance()
                    .bucket(bucket)
                    .get(filePath)
                    .getContent();

            // Decode
            Map<String, Object> diveData = decodeFitFile(fitData);
            diveData.put("status", "done");
            diveData.put("processedAt", com.google.cloud.Timestamp.now());

            // Merge — preserves fileName, fileSizeBytes, uploadedAt written at upload time
            db.collection("users").document(userId)
              .collection("dives").document(diveId)
              .set(diveData, SetOptions.merge()).get();

            logger.info("Successfully processed: " + diveId);

        } catch (Exception e) {
            logger.severe("Failed to process " + filePath + ": " + e.getMessage());
            try {
                db.collection("users").document(userId)
                  .collection("dives").document(diveId)
                  .update("status", "error", "errorMessage", e.getMessage()).get();
            } catch (Exception ignored) {}
            throw new RuntimeException(e);
        }
    }

    /**
     * Mirrors DecodeSample logic:
     * - SessionMesg  → sport, startTime, totalDurationSeconds
     * - DiveSummaryMesg (reference_mesg != 19) → all dive_summary CSV fields
     */
    private Map<String, Object> decodeFitFile(byte[] fitData) {
        Map<String, Object> dive = new HashMap<>();

        Decode decode = new Decode();
        MesgBroadcaster broadcaster = new MesgBroadcaster(decode);

        broadcaster.addListener((SessionMesg mesg) -> {
            if (mesg.getSport() != null)
                dive.put("sport", mesg.getSport().toString().toLowerCase());
            if (mesg.getStartTime() != null)
                dive.put("startTime", mesg.getStartTime().getDate().toInstant().toString());
            if (mesg.getTotalElapsedTime() != null)
                dive.put("totalDurationSeconds", mesg.getTotalElapsedTime());
        });

        broadcaster.addListener((DiveSummaryMesg mesg) -> {
            // Skip the self-referential duplicate (reference_mesg == 19 == DIVE_SUMMARY)
            if (mesg.getReferenceMesg() != null && mesg.getReferenceMesg() == 19) return;

            if (mesg.getDiveNumber()      != null) dive.put("diveNumber",             mesg.getDiveNumber());
            if (mesg.getAvgDepth()        != null) dive.put("avgDepthMeters",         mesg.getAvgDepth());
            if (mesg.getMaxDepth()        != null) dive.put("maxDepthMeters",         mesg.getMaxDepth());
            if (mesg.getBottomTime()      != null) dive.put("bottomTimeSeconds",      mesg.getBottomTime());
            if (mesg.getSurfaceInterval() != null) dive.put("surfaceIntervalSeconds", mesg.getSurfaceInterval());
            if (mesg.getAvgAscentRate()   != null) dive.put("avgAscentRateMps",       mesg.getAvgAscentRate());
            if (mesg.getStartN2()         != null) dive.put("startN2Percent",         mesg.getStartN2());
            if (mesg.getEndN2()           != null) dive.put("endN2Percent",           mesg.getEndN2());
            if (mesg.getO2Toxicity()      != null) dive.put("o2ToxicityOtus",         mesg.getO2Toxicity());
            if (mesg.getStartCns()        != null) dive.put("startCnsPercent",        mesg.getStartCns());
            if (mesg.getEndCns()          != null) dive.put("endCnsPercent",          mesg.getEndCns());
        });

        try {
            decode.read(new ByteArrayInputStream(fitData), broadcaster);
        } catch (FitRuntimeException e) {
            logger.warning("FIT decode warning: " + e.getMessage());
        }

        return dive;
    }
}

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
