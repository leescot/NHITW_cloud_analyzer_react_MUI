import {config as chaiConfig} from './lib/chai.js';

// initialize mocha and expose global methods such as describe(), it()
mocha.setup({
	ui: 'bdd',
	checkLeaks: true,
	timeout: 0,
	slow: 5000,
	noHighlighting: true,
});

Object.assign(chaiConfig, {
	truncateThreshold: 1024,
});

// import sub modules
await import('./test_medicationProcessor.js');
await import('./test_medDaysProcessor.js');
await import('./test_labProcessor.js');
await import('./test_imagingProcessor.js');
await import('./test_allergyProcessor.js');
await import('./test_surgeryProcessor.js');
await import('./test_dischargeProcessor.js');
await import('./test_chineseMedProcessor.js');
await import('./test_patientSummaryProcessor.js');

mocha.run();
