import { generateSecretKey, getPublicKey, UnsignedEvent, finalizeEvent } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';

export class NostrService {
    private static STORAGE_KEY = 'nostr_sk';
    private static RELAYS = [
        'ws://localhost:7777',
    ];
    static getOrCreateSecretKey(): Uint8Array {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            // Assuming stored as hex string
            return this.hexToBytes(stored);
        }

        const sk = generateSecretKey();
        const hex = this.bytesToHex(sk);
        localStorage.setItem(this.STORAGE_KEY, hex);
        return sk;
    }

    static getPublicKey(): string {
        const sk = this.getOrCreateSecretKey();
        return getPublicKey(sk);
    }

    static async publishProposalMetadata(
        title: string,
        description: string,
        proposalHash: string,
        extraData: Record<string, any>,
        relays: string[] = this.RELAYS
    ): Promise<string> {
        const sk = this.getOrCreateSecretKey();

        const content = JSON.stringify({
            title,
            description,
            proposalHash,
            ...extraData,
            timestamp: Date.now()
        });

        const eventTemplate: UnsignedEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'kreivo'],
                ['t', 'proposal'],
                ['proposal_hash', proposalHash],
                ['d', `proposal-${proposalHash}`]
            ],
            content: content,
            pubkey: getPublicKey(sk),
        };

        const signedEvent = finalizeEvent(eventTemplate, sk);

        const pool = new SimplePool();

        try {
            console.log("Publishing to relays:", relays);
            await Promise.any(pool.publish(relays, signedEvent));
            console.log("Published to at least one relay", signedEvent.id);
            return signedEvent.id;
        } catch (err) {
            console.error("Failed to publish to any relay", err);
            throw err;
        } finally {
            pool.close(relays);
        }
    }

    static async getProposalMetadata(proposalHash: string, relays: string[] = this.RELAYS): Promise<any | null> {
        const pool = new SimplePool();
        try {
            const event = await pool.get(relays, {
                kinds: [1],
                '#proposal_hash': [proposalHash]
            });

            if (event) {
                try {
                    return JSON.parse(event.content);
                } catch (e) {
                    console.error("Failed to parse Nostr event content", e);
                    return null;
                }
            }
            return null;
        } catch (err) {
            console.error("Error fetching from Nostr", err);
            return null;
        } finally {
            pool.close(relays);
        }
    }

    static async publishComment(
        proposalId: string,
        content: string,
        authorName?: string,
        relays: string[] = this.RELAYS
    ): Promise<string> {
        const sk = this.getOrCreateSecretKey();

        const eventTemplate: UnsignedEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'kreivo-comment'],
                ['proposal_id', proposalId],
                ...(authorName ? [['name', authorName]] : [])
            ],
            content: content,
            pubkey: getPublicKey(sk),
        };

        const signedEvent = finalizeEvent(eventTemplate, sk);
        const pool = new SimplePool();

        try {
            await Promise.any(pool.publish(relays, signedEvent));
            return signedEvent.id;
        } catch (err) {
            console.error("Failed to publish comment", err);
            throw err;
        } finally {
            pool.close(relays);
        }
    }

    static async getComments(proposalId: string, relays: string[] = this.RELAYS): Promise<any[]> {
        const pool = new SimplePool();
        try {
            const events = await pool.querySync(relays, {
                kinds: [1],
                '#proposal_id': [proposalId]
            });

            return events.map(event => ({
                id: event.id,
                pubkey: event.pubkey,
                content: event.content,
                createdAt: event.created_at * 1000,
                authorName: event.tags.find(t => t[0] === 'name')?.[1]
            })).sort((a, b) => b.createdAt - a.createdAt);
        } catch (err) {
            console.error("Error fetching comments", err);
            return [];
        } finally {
            pool.close(relays);
        }
    }

    private static bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private static hexToBytes(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    }
}
