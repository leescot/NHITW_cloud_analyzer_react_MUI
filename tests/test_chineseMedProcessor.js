import {assert} from './lib/chai.js';

import {chineseMedProcessor} from './src/utils/chineseMedProcessor.js';

describe('utils/chineseMedProcessor', function () {
  describe('.processChineseMedData', function () {
    it('should return [] for invalid input: undefined', function () {
      const input = undefined;
      const expected = [];
      assert.deepEqual(chineseMedProcessor.processChineseMedData(input), expected);
    });

    it('should return [] for invalid input: null', function () {
      const input = null;
      const expected = [];
      assert.deepEqual(chineseMedProcessor.processChineseMedData(input), expected);
    });

    it('should return [] for invalid input: no .rObject', function () {
      const input = {};
      const expected = [];
      assert.deepEqual(chineseMedProcessor.processChineseMedData(input), expected);
    });

    it('should return [] for invalid input: .rObject is not an Array', function () {
      const input = {
        rObject: null,
      };
      const expected = [];
      assert.deepEqual(chineseMedProcessor.processChineseMedData(input), expected);
    });

    it('should group meds by date', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 10.5,
            "r": 16
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”葛根濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "葛根",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032915",
            "order_qty": 7,
            "r": 18
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/26",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "days": 7,
          "visitType": "門診",
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 63,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3",
              "dailyDosage": "9"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 7,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "1"
            }
          ]
        },
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "days": 7,
          "visitType": "門診",
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 10.5,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            },
            {
              "name": "葛根",
              "category": null,
              "dosage": 7,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "1"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should group meds by ICD if same date', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "源於其他腦動脈阻塞或狹窄之腦梗塞",
            "icd_code": "I6359",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/26",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 63,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3",
              "dailyDosage": "9"
            }
          ]
        },
        {
          "date": "2025/03/26",
          "icd_code": "I6359",
          "icd_name": "源於其他腦動脈阻塞或狹窄之腦梗塞",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "延胡索",
              "category": null,
              "dosage": 7,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "1"
            }
          ]
        },
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should exclude meds with missing date', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 10.5,
            "r": 16
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 10.5,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should exclude meds with empty date', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 10.5,
            "r": 16
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 10.5,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should exclude meds with malformated date', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "unexpected_str",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "unexpected_str",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 10.5,
            "r": 16
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 10.5,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should exclude meds with missing `icd_code`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "order_code": "A032905",
            "order_qty": 7,
            "r": 13
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 70,
            "r": 5
          },
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”延胡索濃縮細粒",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "延胡索",
            "fee_ym": null,
            "func_date": "2025-03-19T00:00:00",
            "func_seq_no": "0040",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A032905",
            "order_qty": 10.5,
            "r": 16
          }
        ]
      };
      const expected = [
        {
          "date": "2025/03/19",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "days": 7,
          "visitType": "門診",
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 70,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3.3",
              "dailyDosage": "10"
            },
            {
              "name": "延胡索",
              "category": null,
              "dosage": 10.5,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should take basic fields', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;會診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const expected = [
        {
          "date": "2025/03/26",
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "days": 7,
          "visitType": "會診",
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 63,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": true,
              "sosc_name": "袪風之劑",
              "perDosage": "3",
              "dailyDosage": "9"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should fallback to "" for missing `icd_name`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.strictEqual(result[0].icd_name, "");
    });

    it('should fallback to "" for null `icd_name`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;門診;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": null,
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.strictEqual(result[0].icd_name, "");
    });

    it('should fallback to "門診" for missing `visitType`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.strictEqual(result[0].visitType, "門診");
    });

    it('should fallback to "門診" for empty `visitType`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所;;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.strictEqual(result[0].visitType, "門診");
    });

    it('should fallback to "門診" for blank `visitType`', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "TIDPC PO",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "小續命湯 ",
            "fee_ym": null,
            "func_date": "2025-03-26T00:00:00",
            "func_seq_no": "0044",
            "hosp": "測試院所; ;0000000000",
            "hosp_id": "0000000000",
            "icd_cname": "診斷欠明之腦血管疾病",
            "icd_code": "I679",
            "order_code": "A031463",
            "order_qty": 63,
            "r": 2
          },
        ]
      };
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.strictEqual(result[0].visitType, "門診");
    });
  });

  describe.skip('.groupChineseMedsByDateAndICD');

  describe('.formatDate', function () {
    it('should return YYYY/MM/DD format', function () {
      assert.strictEqual(chineseMedProcessor.formatDate("2022-10-14T00:00:00"), '2022/10/14');
      assert.strictEqual(chineseMedProcessor.formatDate("2024-01-02T00:00:00"), '2024/01/02');
    });

    it('should return null for undefined input', function () {
      assert.isNull(chineseMedProcessor.formatDate(null));
    });

    it('should return null for null input', function () {
      assert.isNull(chineseMedProcessor.formatDate(null));
    });

    it('should return null for empty input', function () {
      assert.isNull(chineseMedProcessor.formatDate(""));
    });

    it('should return null for malformed input', function () {
      assert.isNull(chineseMedProcessor.formatDate("unknown"));
    });
  });

  describe.skip('.createNewGroup');

  describe('.calculateDailyDosage', function () {
    it('should return as string', function () {
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(12, 3), "4");
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(2.1, 7), "0.3");
    });

    it('should round to 1st decimal', function () {
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(2.2, 7), "0.3");
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(2.6, 7), "0.4");
    });

    it('should return "" for missing dosage or days', function () {
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(null, 7), "");
      assert.strictEqual(chineseMedProcessor.calculateDailyDosage(12, null), "");
    });
  });

  describe('.calculatePerDosage', function () {
    it('should return as string', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QD", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HS", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BID", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TID", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QID", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QDPC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HSPC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BIDPC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TIDPC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QIDPC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QDCC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HSCC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BIDCC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TIDCC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QIDCC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QDAC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HSAC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BIDAC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TIDAC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QIDAC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QD PC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HS PC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BID PC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TID PC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QID PC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QD CC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HS CC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BID CC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TID CC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QID CC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QD AC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HS AC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BID AC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TID AC", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QID AC", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "QDP", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(7, "HSP", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "BIDP", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "TIDP", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QIDP", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(84, "Q2H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(42, "Q4H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "Q6H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "Q8H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "Q12H", 7), "1");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "DAILY", 7), "2");
    });

    it('should correctly handle a frequency lower than daily', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QOD", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(8, "QW", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(16, "BIW", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(24, "TIW", 28), "2");
    });

    it('should round to 1st decimal', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(24, "TID", 7), "1.1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(40, "TID", 7), "1.9");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(10, "QOD", 7), "2.5");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(10, "BIW", 10), "3.3");
    });

    it('should return "SPECIAL" for special dosage', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "ST", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "STAT", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "需要時", 7), "SPECIAL");
    });

    it('should return "" for missing dosage, frequency, or days', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(null, "TID", 7), "");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(2.8, null, 7), "");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(2.8, "TID", null), "");
    });
  });

  describe.skip('.formatChineseMedData');

  describe.skip('.sortGroupedData');

  describe('.formatChineseMedList',  function () {
    it('should honor `format`, `showDiagnosis`, `showEffectName`', function () {
      var medications = [
        {
          "name": "小續命湯",
          "category": "袪風之劑",
          "dosage": 63,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": true,
          "sosc_name": "袪風之劑",
          "perDosage": "3",
          "dailyDosage": "9"
        },
        {
          "name": "延胡索",
          "category": null,
          "dosage": 7,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.3",
          "dailyDosage": "1"
        }
      ];
      var groupInfo = {
        "date": "2025/03/26",
        "hosp": "院所甲",
        "days": 7,
        "icd_code": "I679",
        "icd_name": "診斷欠明之腦血管疾病",
        "visitType": "門診",
        "showDiagnosis": true,
        "showEffectName": true
      };

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'none', groupInfo),
        '',
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameVertical', groupInfo),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯
延胡索`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameVertical', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯
延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameHorizontal', groupInfo),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯, 延胡索`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameHorizontal', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯, 延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', groupInfo),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯 9g TIDPC PO - 袪風之劑
延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯 9g TIDPC PO - 袪風之劑
延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯 9g TIDPC PO
延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showDiagnosis: false, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯 9g TIDPC PO
延胡索 1g TIDPC PO`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', groupInfo),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯 9g TIDPC PO - 袪風之劑, 延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯 9g TIDPC PO - 袪風之劑, 延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯 9g TIDPC PO, 延胡索 1g TIDPC PO`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showDiagnosis: false, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯 9g TIDPC PO, 延胡索 1g TIDPC PO`,
      );

      // treat unknown as nameVertical
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'unknown', groupInfo),
        `\
2025/03/26 - 院所甲 7天 [I679 診斷欠明之腦血管疾病]
小續命湯
延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'unknown', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天
小續命湯
延胡索`,
      );
    });
  });
});
