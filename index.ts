import YahooFinance from "yahoo-finance2";

const yh = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
})

// const res = await yh.search('XAUT-USD', { quotesCount: 5 });
// console.log(res.quotes);

const res = await yh.chart('XAUT-USD', {
  period1: '2025-10-01',
  period2: '2025-12-31',
  interval: '1d',
});

console.log(res.quotes.length);