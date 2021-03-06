/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../src');

describe('vietnamese:', () => {
  it('buổi trưa ăn bưởi chua: standard', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    store.add(1, { Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'bưởi', field: 'Code' } },
          { match: { query: 'bưởi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buổi', field: 'Code' } },
          { match: { query: 'buổi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buoi', field: 'Code' } },
          { match: { query: 'buoi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('buổi trưa ăn bưởi chua: asciifolding', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'asciifolding' },
      },
    });
    store.add(1, { Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'bưởi', field: 'Code' } },
          { match: { query: 'bưởi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buổi', field: 'Code' } },
          { match: { query: 'buổi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'buoi', field: 'Code' } },
          { match: { query: 'buoi', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
