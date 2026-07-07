import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UniversalDataset } from '../models/universal-dataset.model';

@Injectable()
export class IngestionCacheService {
  private cache = new Map<string, { datasets: UniversalDataset[], timestamp: number }>();
  private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  getCachedDatasets(hash: string): UniversalDataset[] | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(hash);
      return null;
    }

    return entry.datasets;
  }

  setCachedDatasets(hash: string, datasets: UniversalDataset[]): void {
    this.cache.set(hash, {
      datasets,
      timestamp: Date.now()
    });
  }
}
