/**
 * Created by ngnhat on Mon July 15 2019
 */
const analysis = require('../../src/analysis');

describe('edge-ngram', () => {
  it('normal edge-ngram', () => {
    const analysisConfig = {
      tokenizer: {
        edge_ngram_tokenizer: {
          min_gram: 3,
          max_gram: 10,
          type: 'edge_ngram',
          token_chars: ['letter', 'digit', 'whitespace'],
        },
      },
      analyzer: {
        edge_ngram_analyzer: {
          tokenizer: 'edge_ngram_tokenizer',
        },
      },
    };
    const ngramAnalyzer = analysis(analysisConfig).get('edge_ngram_analyzer');

    expect(ngramAnalyzer('có dấu')).toEqual(['có ', 'có d', 'có dấ', 'có dấu']);
  });

  it('asciifolding edge-ngram', () => {
    const analysisConfig = {
      tokenizer: {
        edge_ngram_tokenizer: {
          min_gram: 4,
          max_gram: 15,
          type: 'edge_ngram',
          token_chars: ['letter', 'digit', 'whitespace'],
        },
      },
      analyzer: {
        edge_ngram_analyzer: {
          filter: ['asciifolding'],
          tokenizer: 'edge_ngram_tokenizer',
        },
      },
    };
    const ngramAnalyzer = analysis(analysisConfig).get('edge_ngram_analyzer');

    expect(ngramAnalyzer('Không có dấu')).toEqual([
      'khon',
      'khong',
      'khong ',
      'khong c',
      'khong co',
      'khong co ',
      'khong co d',
      'khong co da',
      'khong co dau',
    ]);
  });
});
