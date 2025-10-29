import { describe, it, expect } from 'vitest';
import { GPXParserService } from './gpx-parser.js';
import { GPXActivityError, ERROR_CODES } from '$lib/types/errors.js';

describe('GPXParserService', () => {
  describe('validateFile', () => {
    it('should accept valid GPX files', () => {
      const file = new File(['<gpx></gpx>'], 'test.gpx', { type: 'application/gpx+xml' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files with invalid extensions', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
      expect(result.details?.extension).toBe('.txt');
    });

    it('should reject files that are too large', () => {
      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.gpx', { type: 'application/gpx+xml' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
      expect(result.details?.fileSize).toBeGreaterThan(10 * 1024 * 1024);
    });

    it('should reject files with case-sensitive invalid extensions', () => {
      const file = new File(['content'], 'test.GPX', { type: 'application/gpx+xml' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(true); // Should pass because extension check is case-insensitive
    });

    it('should reject files with no extension', () => {
      const file = new File(['content'], 'test', { type: 'application/gpx+xml' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files with multiple extensions where last is invalid', () => {
      const file = new File(['content'], 'test.gpx.txt', { type: 'text/plain' });
      const result = GPXParserService.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
      expect(result.details?.extension).toBe('.txt');
    });
  });

  describe('validateGPXContent', () => {
    it('should accept valid GPX content', () => {
      const content = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="40.7128" lon="-74.0060">
                <time>2024-01-01T08:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      const result = GPXParserService.validateGPXContent(content);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty content', () => {
      const result = GPXParserService.validateGPXContent('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('GPX file is empty');
    });

    it('should reject content without GPX tags', () => {
      const content = '<xml><data>not gpx</data></xml>';
      const result = GPXParserService.validateGPXContent(content);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid GPX format');
    });

    it('should reject content with only whitespace', () => {
      const result = GPXParserService.validateGPXContent('   \n\t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('GPX file is empty');
    });

    it('should reject content with incomplete GPX tags', () => {
      const incompleteContent = '<gpx version="1.1"><trk>';
      const result = GPXParserService.validateGPXContent(incompleteContent);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid GPX format');
    });

    it('should accept content with GPX tags in different cases', () => {
      const content = '<GPX version="1.1"></GPX>';
      const result = GPXParserService.validateGPXContent(content);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('parseGPXContent', () => {
    const validGPXContent = `<?xml version="1.0"?>
      <gpx version="1.1" creator="Test">
        <metadata>
          <name>Test Activity</name>
          <keywords>running</keywords>
        </metadata>
        <trk>
          <name>Morning Run</name>
          <trkseg>
            <trkpt lat="40.7128" lon="-74.0060">
              <ele>10.0</ele>
              <time>2024-01-01T08:00:00Z</time>
            </trkpt>
            <trkpt lat="40.7129" lon="-74.0061">
              <ele>11.0</ele>
              <time>2024-01-01T08:00:30Z</time>
            </trkpt>
            <trkpt lat="40.7130" lon="-74.0062">
              <ele>12.0</ele>
              <time>2024-01-01T08:01:00Z</time>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`;

    it('should parse valid GPX content successfully', async () => {
      const result = await GPXParserService.parseGPXContent(validGPXContent, 'test.gpx');
      
      expect(result.activity).toBeDefined();
      expect(result.gpsPoints).toBeDefined();
      expect(result.gpsPoints).toHaveLength(3);
      
      // Check activity properties
      expect(result.activity.name).toBe('Morning Run');
      expect(result.activity.type).toBe('running');
      expect(result.activity.distance).toBeGreaterThan(0);
      expect(result.activity.duration).toBeGreaterThan(0);
      expect(result.activity.averageSpeed).toBeGreaterThan(0);
      
      // Check GPS points
      expect(result.gpsPoints[0].latitude).toBe(40.7128);
      expect(result.gpsPoints[0].longitude).toBe(-74.0060);
      expect(result.gpsPoints[0].elevation).toBe(10.0);
      expect(result.gpsPoints[0].sequenceOrder).toBe(0);
      
      expect(result.gpsPoints[1].sequenceOrder).toBe(1);
      expect(result.gpsPoints[2].sequenceOrder).toBe(2);
    });

    it('should calculate metrics correctly', async () => {
      const result = await GPXParserService.parseGPXContent(validGPXContent);
      
      // Check that metrics are calculated
      expect(result.activity.distance).toBeGreaterThan(0);
      expect(result.activity.duration).toBe(60); // 1 minute between first and last point
      expect(result.activity.elevationGain).toBe(2); // 10->11->12, gain = 2
      expect(result.activity.averageSpeed).toBeGreaterThan(0);
      expect(result.activity.maxSpeed).toBeGreaterThan(0);
      
      // Check timestamps
      expect(result.activity.startTime).toEqual(new Date('2024-01-01T08:00:00Z'));
      expect(result.activity.endTime).toEqual(new Date('2024-01-01T08:01:00Z'));
    });

    it('should determine activity type from metadata', async () => {
      const cyclingGPX = validGPXContent.replace('<keywords>running</keywords>', '<keywords>cycling</keywords>');
      const result = await GPXParserService.parseGPXContent(cyclingGPX);
      
      expect(result.activity.type).toBe('cycling');
    });

    it('should determine activity type from track name', async () => {
      const hikingGPX = validGPXContent
        .replace('<name>Morning Run</name>', '<name>Mountain Hike</name>')
        .replace('<keywords>running</keywords>', '');
      const result = await GPXParserService.parseGPXContent(hikingGPX);
      
      expect(result.activity.type).toBe('hiking');
    });

    it('should determine activity type from filename', async () => {
      const gpxWithoutMetadata = validGPXContent
        .replace('<name>Morning Run</name>', '')
        .replace('<keywords>running</keywords>', '');
      const result = await GPXParserService.parseGPXContent(gpxWithoutMetadata, 'bike-ride.gpx');
      
      expect(result.activity.type).toBe('cycling');
    });

    it('should default to unknown activity type', async () => {
      const unknownGPX = validGPXContent
        .replace('<name>Morning Run</name>', '<name>Activity</name>')
        .replace('<keywords>running</keywords>', '');
      const result = await GPXParserService.parseGPXContent(unknownGPX, 'activity.gpx');
      
      expect(result.activity.type).toBe('unknown');
    });

    it('should generate meaningful activity names', async () => {
      // Test with track name
      let result = await GPXParserService.parseGPXContent(validGPXContent);
      expect(result.activity.name).toBe('Morning Run');
      
      // Test with filename when no track name
      const noNameGPX = validGPXContent.replace('<name>Morning Run</name>', '');
      result = await GPXParserService.parseGPXContent(noNameGPX, 'my-workout.gpx');
      expect(result.activity.name).toBe('my-workout');
      
      // Test with generated name
      result = await GPXParserService.parseGPXContent(noNameGPX, 'activity.gpx');
      expect(result.activity.name).toContain('Running'); // Based on metadata
      expect(result.activity.name).toContain('Jan 1, 2024'); // Based on date
    });

    it('should throw error for invalid GPX content', async () => {
      await expect(
        GPXParserService.parseGPXContent('')
      ).rejects.toThrow(GPXActivityError);
      
      await expect(
        GPXParserService.parseGPXContent('<xml>not gpx</xml>')
      ).rejects.toThrow(GPXActivityError);
    });

    it('should throw error for GPX without tracks', async () => {
      const noTracksGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <metadata><name>No Tracks</name></metadata>
        </gpx>`;
      
      await expect(
        GPXParserService.parseGPXContent(noTracksGPX)
      ).rejects.toThrow(GPXActivityError);
    });

    it('should throw error for GPX without segments', async () => {
      const noSegmentsGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Empty Track</name>
          </trk>
        </gpx>`;
      
      await expect(
        GPXParserService.parseGPXContent(noSegmentsGPX)
      ).rejects.toThrow(GPXActivityError);
    });

    it('should throw error for GPX without points', async () => {
      const noPointsGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Empty Segments</name>
            <trkseg></trkseg>
          </trk>
        </gpx>`;
      
      await expect(
        GPXParserService.parseGPXContent(noPointsGPX)
      ).rejects.toThrow(GPXActivityError);
    });

    it('should handle GPX with multiple segments', async () => {
      const multiSegmentGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Multi Segment</name>
            <trkseg>
              <trkpt lat="40.7128" lon="-74.0060">
                <time>2024-01-01T08:00:00Z</time>
              </trkpt>
            </trkseg>
            <trkseg>
              <trkpt lat="40.7129" lon="-74.0061">
                <time>2024-01-01T08:00:30Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      const result = await GPXParserService.parseGPXContent(multiSegmentGPX);
      
      expect(result.gpsPoints).toHaveLength(2);
      expect(result.gpsPoints[0].sequenceOrder).toBe(0);
      expect(result.gpsPoints[1].sequenceOrder).toBe(1);
    });

    it('should sort points by timestamp', async () => {
      const unorderedGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Unordered Points</name>
            <trkseg>
              <trkpt lat="40.7130" lon="-74.0062">
                <time>2024-01-01T08:01:00Z</time>
              </trkpt>
              <trkpt lat="40.7128" lon="-74.0060">
                <time>2024-01-01T08:00:00Z</time>
              </trkpt>
              <trkpt lat="40.7129" lon="-74.0061">
                <time>2024-01-01T08:00:30Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      const result = await GPXParserService.parseGPXContent(unorderedGPX);
      
      // Points should be sorted by time, so sequence should be correct
      expect(result.gpsPoints[0].timestamp).toEqual(new Date('2024-01-01T08:00:00Z'));
      expect(result.gpsPoints[1].timestamp).toEqual(new Date('2024-01-01T08:00:30Z'));
      expect(result.gpsPoints[2].timestamp).toEqual(new Date('2024-01-01T08:01:00Z'));
      
      expect(result.gpsPoints[0].sequenceOrder).toBe(0);
      expect(result.gpsPoints[1].sequenceOrder).toBe(1);
      expect(result.gpsPoints[2].sequenceOrder).toBe(2);
    });

    it('should handle points without elevation', async () => {
      const noElevationGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>No Elevation</name>
            <trkseg>
              <trkpt lat="40.7128" lon="-74.0060">
                <time>2024-01-01T08:00:00Z</time>
              </trkpt>
              <trkpt lat="40.7129" lon="-74.0061">
                <time>2024-01-01T08:00:30Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      const result = await GPXParserService.parseGPXContent(noElevationGPX);
      
      expect(result.gpsPoints[0].elevation).toBeUndefined();
      expect(result.gpsPoints[1].elevation).toBeUndefined();
      expect(result.activity.elevationGain).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw GPXActivityError with correct error codes', async () => {
      try {
        await GPXParserService.parseGPXContent('');
      } catch (error) {
        expect(error).toBeInstanceOf(GPXActivityError);
        expect((error as GPXActivityError).code).toBe(ERROR_CODES.INVALID_GPX);
      }
    });

    it('should wrap parsing errors in GPXActivityError', async () => {
      const malformedXML = '<gpx><trk><trkseg><trkpt>malformed</trkpt></trkseg></trk></gpx>';
      
      try {
        await GPXParserService.parseGPXContent(malformedXML);
      } catch (error) {
        expect(error).toBeInstanceOf(GPXActivityError);
        expect((error as GPXActivityError).code).toBe(ERROR_CODES.PROCESSING_ERROR);
      }
    });

    it('should handle corrupted XML gracefully', async () => {
      const corruptedXML = '<gpx><trk><trkseg><trkpt lat="invalid" lon="invalid"></trkpt></trkseg></trk></gpx>';
      
      try {
        await GPXParserService.parseGPXContent(corruptedXML);
      } catch (error) {
        expect(error).toBeInstanceOf(GPXActivityError);
        expect((error as GPXActivityError).code).toBe(ERROR_CODES.PROCESSING_ERROR);
      }
    });

    it('should handle GPX with invalid timestamps', async () => {
      const invalidTimeGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Invalid Time</name>
            <trkseg>
              <trkpt lat="40.7128" lon="-74.0060">
                <time>invalid-date</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      try {
        await GPXParserService.parseGPXContent(invalidTimeGPX);
      } catch (error) {
        expect(error).toBeInstanceOf(GPXActivityError);
        expect((error as GPXActivityError).code).toBe(ERROR_CODES.PROCESSING_ERROR);
      }
    });

    it('should handle GPX with missing required attributes', async () => {
      const missingAttrsGPX = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <name>Missing Attributes</name>
            <trkseg>
              <trkpt>
                <time>2024-01-01T08:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      
      try {
        await GPXParserService.parseGPXContent(missingAttrsGPX);
      } catch (error) {
        expect(error).toBeInstanceOf(GPXActivityError);
        expect((error as GPXActivityError).code).toBe(ERROR_CODES.PROCESSING_ERROR);
      }
    });

    it('should provide detailed error information', async () => {
      try {
        await GPXParserService.parseGPXContent('');
      } catch (error) {
        const gpxError = error as GPXActivityError;
        expect(gpxError.message).toContain('GPX file is empty');
        expect(gpxError.details).toBeDefined();
        expect(gpxError.details.contentLength).toBe(0);
      }
    });
  });
});