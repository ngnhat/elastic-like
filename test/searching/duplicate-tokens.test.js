/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

const store = new Store({
  docKey: 'Id',
  mapping: {
    Code: { type: 'text', analyzer: 'standard' },
    Name: { type: 'text', analyzer: 'standard' },
  },
});

store.add(1, { Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

describe('duplicates', () => {
  it('chua chua', () => {
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'chua chua', field: 'Code' } },
          { match: { query: 'chua chua', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('bưởi trưa ăn bưởi chua', () => {
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'bưởi trưa ăn bưởi chua', field: 'Code' } },
          { match: { query: 'bưởi trưa ăn bưởi chua', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('buổi trưa ăn buổi chua', () => {
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buổi trưa ăn buổi chua', field: 'Code' } },
          { match: { query: 'buổi trưa ăn buổi chua', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('buổi trưa ăn bưởi chua', () => {
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buổi trưa ăn bưởi chua', field: 'Code' } },
          { match: { query: 'buổi trưa ăn bưởi chua', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
