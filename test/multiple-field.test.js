const Store = require('../index');

describe('single field', () => {
  it('multiple documents', () => {
    const store = new Store();

    store.add({ Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' });
    store.add({ Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' });
    store.add({ Id: 3, Code: 'ccc', Name: 'ccc ddd eee' });

    expect(store.search('ccc')).toMatchSnapshot();
  });
});
