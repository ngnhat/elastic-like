/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

const store = new Store();

store.add({ Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

describe('duplicates', () => {
  it('chua chua', () => {
    expect(store.search('chua chua')).toMatchSnapshot();
  });

  it('bưởi trưa ăn bưởi chua', () => {
    expect(store.search('bưởi trưa ăn bưởi chua')).toMatchSnapshot();
  });

  it('buổi trưa ăn buổi chua', () => {
    expect(store.search('buổi trưa ăn buổi chua')).toMatchSnapshot();
  });

  it('buổi trưa ăn bưởi chua', () => {
    expect(store.search('buổi trưa ăn bưởi chua')).toMatchSnapshot();
  });
});
