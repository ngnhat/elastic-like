const Store = require('../../index');

const store = new Store({
  docKey: 'id',
  mapping: {
    code: { type: 'text', analyzer: 'standard' },
    name: { type: 'text', analyzer: 'standard' },
  },
});

store.add(1, { id: 1, code: 'code 001', name: 'aaa bbb ccc' });
store.add(2, { id: 2, code: 'code 002', name: 'ddd eee fff' });

describe('clauses', () => {
  it('simple match clause', () => {
    expect(store.search({
      match: { query: 'code 001', field: 'code' },
    })).toEqual([{
      score: 0.8754687373538999,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });

  it('simple bool clause: must', () => {
    expect(store.search({
      bool: {
        must: [
          { match: { query: '001', field: 'code' } },
          { match: { query: 'code', field: 'code' } },
        ],
      },
    })).toEqual([{
      score: 0.8754687373538999,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);

    expect(store.search({
      bool: {
        must: [
          { match: { query: 'code 001', field: 'code' } },
          { match: { query: 'ddd eee fff', field: 'name' } },
        ],
      },
    })).toEqual([]);
  });

  it('simple bool clause: must and should', () => {
    expect(store.search({
      bool: {
        must: [
          { match: { query: 'code', field: 'code' } },
        ],
        should: [
          { match: { query: 'aaa ccc', field: 'name' } },
        ],
      },
    })).toEqual([{
      score: 1.5686159179138452,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }, {
      score: 0.1823215567939546,
      source: {
        id: 2,
        code: 'code 002',
        name: 'ddd eee fff',
      },
    }]);
  });

  it('simple bool clause: difficult logic', () => {
    expect(store.search({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    must: [
                      { match: { query: 'aaa ccc', field: 'name' } },
                    ],
                  },
                },
              ],
              should: [
                { match: { query: 'code', field: 'code' } },
                {
                  bool: {
                    should: [
                      { match: { query: 'ddd eee', field: 'name' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
        should: [
          {
            bool: {
              must: [
                { match: { query: 'bbb', field: 'name' } },
              ],
              should: [
                { match: { query: 'aaa bbb ccc', field: 'name' } },
                { match: { query: 'ddd eee fff', field: 'name' } },
              ],
            },
          },
        ],
      },
    })).toEqual([
      {
        score: 4.341204640153626,
        source: {
          code: 'code 001',
          id: 1,
          name: 'aaa bbb ccc',
        },
      },
    ]);
  });
});

/**
Kibana

POST test/_doc/1
{ "Id": 1, "Code": "code 001", "Name": "aaa bbb ccc" }

POST test/_doc/2
{ "Id": 2, "Code": "code 002", "Name": "ddd eee fff" }

GET test/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "bool": {
            "must": [
              {
                "bool": {
                  "must": [
                    {
                      "match": {
                        "Name": {
                          "query" : "aaa ccc",
                          "operator" : "and"
                        }
                      }
                    }
                  ]
                }
              }
            ],
            "should": [
              {
                "match": {
                  "Code": {
                    "query" : "code",
                    "operator" : "and"
                  }
                }
              },
              {
                "match": {
                  "Name": {
                    "query" : "ddd eee",
                    "operator" : "and"
                  }
                }
              }
            ]
          }
        }
      ],
      "should": [
        {
          "bool": {
            "must": [
              {
                "match": {
                  "Name": {
                    "query" : "bbb",
                    "operator" : "and"
                  }
                }
              }
            ],
            "should": [
              {
                "match": {
                  "Name": {
                    "query" : "aaa bbb ccc",
                    "operator" : "and"
                  }
                }
              },
              {
                "match": {
                  "Name": {
                    "query" : "ddd eee fff",
                    "operator" : "and"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
*/
