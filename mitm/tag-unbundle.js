

// textutil -convert txt *

var parse = require('csv-parse/lib/sync'),
	csvstr = require('csv-stringify'),
	fs = require('fs'),
	promise = require('bluebird'),
	_ = require('lodash'),
	qs = require('querystring'),
	config = JSON.parse(fs.readFileSync('./munge-config.json')),
	cutils = require('./client-utils'),
	round_re = /ROUND\W*(\d+)/,
	headers,
	exit_re = /exit\W*\>|exit interview|exit questions|exit survey/i;

var loadCSV = (fname) => {
	var text = 	fs.readFileSync(fname).toString();
	console.log("Parsing file ", fname, "(", text.length, ")");
	var data = parse(text, {max_limit_on_data_read:9999999999});
	headers = data[0];
	data = data.slice(1);
	data = data.map((x) => _.zipObject(headers,x));
	return data;
}, s = (str) => (str||'').split(' ').map((x) => x.trim().toUpperCase().trim(',')).filter((x) => x.length),
  main = (fname, cols) => {
	console.info('got cols');
	var rows = loadCSV(fname),
		people = cols,
		rater_a = cols[0], rater_b = cols[1],
		tags = _.uniq(_.flatten(rows.map((r) => _.flatten(cols.map((c) => s(r[c])))))),
		header = ['id', rater_a, rater_b ],
		rowos = [header].concat(
			rows.filter((r) => {
				return r[rater_a].length && r[rater_b].length;
			}).reduce((cat, r) => {
				// [[T], [T], [T], [T]]
				return cat.concat(tags.map((T) => {
					return [ r.id + '-' + T, s(r[rater_a]).indexOf(T) >= 0 ? 'YES' : 'NO', s(r[rater_b]).indexOf(T) >= 0 ? 'YES' : 'NO' ];
				}));
			}, []));

	console.log('rowos ', rowos);

	return new Promise((acc, rej) => {
		csvstr(rowos, (err, output) => {
			if (!err) { return acc(output); }
			console.error("Error ", err);
			rej(err);
		});
	});	
};

if (require.main === module) { 
	main(process.argv[2], process.argv.slice(3)).then((data) => {
		// write it !
		console.info("Writing output ", 'tag-kappa.csv', data.length);
		fs.writeFileSync('./tag-kappa.csv', data);
		console.log('done');
	}); 
}