/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../index');
const simpleData = require('./example-data/simple-data.json');

const store = new Store();

beforeAll(() => {
  simpleData.forEach((data) => {
    store.add(data);
  });
});

describe('simple data', () => {
  it('keyword: cao su', () => {
    expect(store.search('cao su')).toMatchSnapshot();
  });

  it('keyword: sp000740', () => {
    expect(store.search('sp000740')).toMatchSnapshot();
  });
});
