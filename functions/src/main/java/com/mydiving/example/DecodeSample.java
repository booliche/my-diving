package com.mydiving.example;

import com.garmin.fit.*;
import java.io.FileInputStream;
import java.io.IOException;

public class DecodeSample {
    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage: java DecodeSample <path_to_fit_file>");
            return;
        }

        String fitFilePath = args[0];
        try (FileInputStream fitFileStream = new FileInputStream(fitFilePath)) {
            Decode decode = new Decode();
            MesgBroadcaster broadcaster = new MesgBroadcaster(decode);

            broadcaster.addListener((SessionMesg mesg) -> {
                System.out.println("=== Session ===");
                System.out.println("  sport:             " + mesg.getSport());
                System.out.println("  startTime:         " + mesg.getStartTime());
                System.out.println("  totalElapsedTime:  " + mesg.getTotalElapsedTime());
            });

            broadcaster.addListener((DiveSummaryMesg mesg) -> {
                // Skip the self-referential summary (reference_mesg == DIVE_SUMMARY == 19)
                if (mesg.getReferenceMesg() != null && mesg.getReferenceMesg().getValue() == 19) return;
                System.out.println("=== Dive Summary ===");
                System.out.println("  reference msg:     " + mesg.getReferenceMesg());
                System.out.println("  diveNumber:        " + mesg.getDiveNumber());
                System.out.println("  avgDepth:          " + mesg.getAvgDepth() + " m");
                System.out.println("  maxDepth:          " + mesg.getMaxDepth() + " m");
                System.out.println("  bottomTime:        " + mesg.getBottomTime() + " s");
                System.out.println("  surfaceInterval:   " + mesg.getSurfaceInterval() + " s");
                System.out.println("  avgAscentRate:     " + mesg.getAvgAscentRate() + " m/s");
                System.out.println("  startN2:           " + mesg.getStartN2() + " %");
                System.out.println("  endN2:             " + mesg.getEndN2() + " %");
                System.out.println("  o2Toxicity:        " + mesg.getO2Toxicity() + " OTUs");
                System.out.println("  startCns:          " + mesg.getStartCns() + " %");
                System.out.println("  endCns:            " + mesg.getEndCns() + " %");
            });

            decode.read(fitFileStream, broadcaster);
            System.out.println("Done.");
        } catch (IOException e) {
            System.err.println("Error reading FIT file: " + e.getMessage());
        }
    }
}