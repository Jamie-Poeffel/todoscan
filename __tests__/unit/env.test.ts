import { Environment } from '../../src/env';
import { describe, expect, test, beforeEach } from '@jest/globals';
import path from 'path';

describe('env module', () => {
    beforeEach(() => {
        Environment.destroyInstance();
        delete process.env.API_TOKEN_TASKIST;
    });

    test('env.API_TOKEN_TASKIST call is equal to YOUR_API_TOKEN_TASKIST', () => {
        const envPath = path.resolve(__dirname, '../../.env.test');
        const env = Environment.getInstance({ path: envPath, encoding: 'utf8', quiet: true });
        expect(env.API_TOKEN_TASKIST).toBe("YOUR_API_TOKEN_TASKIST");
    });

    test('env.API_TOKEN_TASKIST call if is not set', () => {
        expect(() => {
            Environment.getInstance({ path: './nonexistent.env', quiet: true });
        }).toThrow("API_TOKEN_TASKIST is not set in environment variables");
    });
});
