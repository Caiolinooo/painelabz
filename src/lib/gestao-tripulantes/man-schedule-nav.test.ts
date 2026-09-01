import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adjacentColumnIndex } from './man-schedule-nav';

describe('adjacentColumnIndex', () => {
  it('moves one column and clamps at the ends', () => {
    assert.equal(adjacentColumnIndex(4, 1, 10), 5);
    assert.equal(adjacentColumnIndex(4, -1, 10), 3);
    assert.equal(adjacentColumnIndex(0, -1, 10), 0);
    assert.equal(adjacentColumnIndex(9, 1, 10), 9);
    assert.equal(adjacentColumnIndex(0, 1, 0), 0);
  });
});
