/**
 * Created by ngnhat on Thu July 04 2019
 */
const Store = require('../../index');

const store = new Store({
  mapping: {
    code: {
      type: 'text',
      analyzer: 'standard',
    },
    name: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        folded: {
          type: 'text',
          analyzer: 'asciifolding',
        },
      },
    },
  },
});

store.add(1, { id: 1, code: 'code 001', name: 'buổi trưa ăn bưởi chua' });
store.add(2, { id: 2, code: 'code 002', name: 'nồi đồng nấu ốc nồi đất nấu ếch' });

describe('multiple-mapping', () => {
  it('default', () => {
    expect(store.search({
      match: { query: 'an trua', field: 'name' },
    })).toEqual([]);

    expect(store.search({
      match: { query: 'ăn trưa', field: 'name' },
    })).toEqual([{
      score: 1.5308115339007287,
      source: {
        id: 1,
        code: 'code 001',
        name: 'buổi trưa ăn bưởi chua',
      },
    }]);
  });

  it('fields', () => {
    expect(store.search({
      match: { query: 'an trua', field: 'name.folded' },
    })).toEqual([{
      score: 1.5308115339007287,
      source: {
        id: 1,
        code: 'code 001',
        name: 'buổi trưa ăn bưởi chua',
      },
    }]);
  });
});
