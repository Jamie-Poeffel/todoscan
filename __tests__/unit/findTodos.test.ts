import { findTodos } from '../../src/findTodos';
import { getFilteredFiles } from '../../src/scan';
import { readFile } from 'fs/promises';

jest.mock('../../src/scan');
jest.mock('fs/promises');

const mockGetFilteredFiles = getFilteredFiles as jest.Mock;
const mockReadFile = readFile as jest.Mock;

describe('findTodos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return an empty array when no files are found', async () => {
        mockGetFilteredFiles.mockResolvedValue([]);

        const result = await findTodos();

        expect(mockGetFilteredFiles).toHaveBeenCalledWith(process.cwd());
        expect(result).toEqual([]);
    });

    it('should find TODOs in a single file', async () => {
        mockGetFilteredFiles.mockResolvedValue(['file1.ts']);
        mockReadFile.mockResolvedValue(`
      const a = 1;
      // TODO: implement this
      // FIXME: broken logic
    `);

        const result = await findTodos();

        expect(result).toEqual([
            {
                file: 'file1.ts',
                line: 3,
                type: 'TODO',
                text: 'implement this',
            },
            {
                file: 'file1.ts',
                line: 4,
                type: 'FIXME',
                text: 'broken logic',
            },
        ]);
    });

    it('should scan multiple files', async () => {
        mockGetFilteredFiles.mockResolvedValue(['a.ts', 'b.ts']);

        mockReadFile.mockImplementation((file: string) => {
            if (file === 'a.ts') {
                return Promise.resolve('// NOTE: something important');
            }
            if (file === 'b.ts') {
                return Promise.resolve('// BUG: nasty issue');
            }
            return Promise.resolve('');
        });

        const result = await findTodos();

        expect(result).toEqual([
            {
                file: 'a.ts',
                line: 1,
                type: 'NOTE',
                text: 'something important',
            },
            {
                file: 'b.ts',
                line: 1,
                type: 'BUG',
                text: 'nasty issue',
            },
        ]);
    });

    it('should skip files that cannot be read', async () => {
        mockGetFilteredFiles.mockResolvedValue(['good.ts', 'bad.ts']);

        mockReadFile.mockImplementation((file: string) => {
            if (file === 'bad.ts') {
                return Promise.reject(new Error('Permission denied'));
            }
            return Promise.resolve('// TODO: works fine');
        });

        const result = await findTodos();

        expect(result).toEqual([
            {
                file: 'good.ts',
                line: 1,
                type: 'TODO',
                text: 'works fine',
            },
        ]);
    });

    it('should ignore lines without TODO-like comments', async () => {
        mockGetFilteredFiles.mockResolvedValue(['file.ts']);
        mockReadFile.mockResolvedValue(`
      const x = 1;
      // just a comment
      // todo lowercase should not match
    `);

        const result = await findTodos();

        expect(result).toEqual([]);
    });
});
