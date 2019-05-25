const Store = require('../index');

describe('single field', () => {
  it('multiple documents', () => {
    const store = new Store();

    store.add({ Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' });
    store.add({ Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' });
    store.add({ Id: 3, Code: 'ccc', Name: 'ccc ddd eee' });
    store.add({ Id: 4, Code: 'ddd', Name: 'ddd eee fff' });

    expect(store.search('ccc')).toMatchSnapshot();
  });

  it('multiple documents - multiple terms', () => {
    const store = new Store();
    store.add({ Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' });
    store.add({ Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' });
    store.add({ Id: 3, Code: 'ccc', Name: 'ccc ddd eee' });
    store.add({ Id: 4, Code: 'ddd', Name: 'ddd eee fff' });

    expect(store.search('bbb aaa')).toMatchSnapshot();
    expect(store.search('ccc fff')).toMatchSnapshot();
  });
});
