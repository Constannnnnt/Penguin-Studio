import type { ExampleMetadata } from '@/store/segmentationStore';
import { env } from '@/lib/env';

export interface LoadedExample {
  imageBlob: Blob;
  metadataBlob: Blob;
  metadata: ExampleMetadata;
  exampleId: string;
}

class ExampleLoaderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.apiBaseUrl;
  }

  async loadExample(exampleId: string): Promise<LoadedExample> {
    try {
      const [imageResponse, metadataResponse] = await Promise.all([
        fetch(`${this.baseUrl}/examples/${exampleId}.png`),
        fetch(`${this.baseUrl}/examples/${exampleId}.json`),
      ]);

      if (!imageResponse.ok) {
        throw new Error(`Failed to load example image: ${imageResponse.statusText}`);
      }

      if (!metadataResponse.ok) {
        throw new Error(`Failed to load example metadata: ${metadataResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const metadata: ExampleMetadata = await metadataResponse.json();
      const metadataBlob = new Blob(
        [JSON.stringify(metadata)],
        { type: 'application/json' }
      );

      return {
        imageBlob,
        metadataBlob,
        metadata,
        exampleId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load example ${exampleId}: ${errorMessage}`);
    }
  }

  async listExamples(): Promise<string[]> {
    return ['01'];
  }
}

export const exampleLoader = new ExampleLoaderService();

export const loadExample = (exampleId: string): Promise<LoadedExample> => {
  return exampleLoader.loadExample(exampleId);
};
