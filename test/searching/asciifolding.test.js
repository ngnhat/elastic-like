/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

describe('vietnamese:', () => {
  it('buổi trưa ăn bưởi chua: standard', () => {
    const store = new Store();
    store.add({ Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

    expect(store.search('bưởi')).toMatchSnapshot();
    expect(store.search('buổi')).toMatchSnapshot();
    expect(store.search('buoi')).toMatchSnapshot();
  });

  it('buổi trưa ăn bưởi chua: asciifolding', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'asciifolding' },
      },
    });
    store.add({ Id: 1, Code: 'code001', Name: 'buổi trưa ăn bưởi chua' });

    expect(store.search('bưởi')).toMatchSnapshot();
    expect(store.search('buổi')).toMatchSnapshot();
    expect(store.search('buoi')).toMatchSnapshot();
  });
});
