import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type SyncType = 'INSERT_SESSION' | 'UPDATE_PROFILE';

export interface SyncItem {
  id: string;
  type: SyncType;
  payload: any;
  retryCount: number;
  timestamp: number;
}

const STORAGE_KEY = 'offline_sync_queue_v1';

export const SyncQueue = {
  async addToQueue(type: SyncType, payload: any) {
    try {
      const item: SyncItem = {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        type,
        payload,
        retryCount: 0,
        timestamp: Date.now(),
      };
      
      const currentQueue = await this.getQueue();
      const newQueue = [...currentQueue, item];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
      console.log(`[SyncQueue] Added item ${item.id} (${type})`);
    } catch (error) {
      console.error('[SyncQueue] Failed to add to queue', error);
    }
  },

  async getQueue(): Promise<SyncItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  },

  async clearQueue() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async processQueue() {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncQueue] Processing ${queue.length} items...`);
    const remainingQueue: SyncItem[] = [];

    for (const item of queue) {
      let success = false;
      try {
        if (item.type === 'INSERT_SESSION') {
          const { error } = await supabase.from('focus_sessions').insert(item.payload);
          if (!error) success = true;
          else console.warn(`[SyncQueue] Failed to sync session: ${error.message}`);
        } else if (item.type === 'UPDATE_PROFILE') {
           const { id, ...updates } = item.payload;
           const { error } = await supabase.from('profiles').update(updates).eq('id', id);
           if (!error) success = true;
           else console.warn(`[SyncQueue] Failed to sync profile: ${error.message}`);
        }
      } catch (e) {
        console.warn(`[SyncQueue] Exception processing item ${item.id}`, e);
      }

      if (!success) {
        item.retryCount++;
        // Keep trying for a long time (e.g. 50 retries), assuming background sync might run periodically
        if (item.retryCount < 50) {
             remainingQueue.push(item);
        } else {
             console.error(`[SyncQueue] Item ${item.id} failed too many times, discarding.`);
        }
      } else {
          console.log(`[SyncQueue] Item ${item.id} synced successfully.`);
      }
    }

    // Only update storage if items were removed
    if (remainingQueue.length !== queue.length) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
    }
  },
};
