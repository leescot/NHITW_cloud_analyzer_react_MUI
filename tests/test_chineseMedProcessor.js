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
          "visitType": "門診",
          "days": 7,
          "dosage": 70,
          "freq": "TIDPC PO",
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
          "visitType": "門診",
          "days": 7,
          "dosage": 87.5,
          "freq": "TIDPC PO",
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

    it('should group meds by hosp if same date', function () {
      const input = {
        "rObject": [
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A033312",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "止嗽散   ",
            "cdrug_sosc": "14",
            "cdrug_sosc_name": "袪痰之劑",
            "drug_fre": "TIDPC PO",
            "day": 7,
            "cdrug_dose_name": "濃縮散劑",
            "order_qty": 35,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“晉安”止嗽散濃縮散",
            "r": 91
          },
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A035578",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "甘草",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TIDPC PO",
            "day": 7,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 14,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“天明”甘草濃縮細粒",
            "r": 92
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "”仙豐”藿香正氣散濃縮散",
            "cdrug_sosc": "05",
            "cdrug_sosc_name": "和解之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "藿香正氣散(丸)",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A034408",
            "order_qty": 24.5,
            "r": 107
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "“仙豐”桔梗濃縮散",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "桔梗",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A042851",
            "order_qty": 3.5,
            "r": 108
          }
        ]
      };
      const expected = [
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所甲",
          "visitType": "門診",
          "days": 7,
          "dosage": 49,
          "freq": "TIDPC PO",
          "medications": [
            {
              "name": "止嗽散",
              "category": "袪痰之劑",
              "dosage": 35,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "袪痰之劑",
              "perDosage": "1.7",
              "dailyDosage": "5"
            },
            {
              "name": "甘草",
              "category": null,
              "dosage": 14,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.7",
              "dailyDosage": "2"
            }
          ]
        },
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所乙",
          "visitType": "門診",
          "days": 7,
          "dosage": 28,
          "freq": "BIDPC",
          "medications": [
            {
              "name": "藿香正氣散(丸)",
              "category": "和解之劑",
              "dosage": 24.5,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "和解之劑",
              "perDosage": "1.8",
              "dailyDosage": "3.5"
            },
            {
              "name": "桔梗",
              "category": null,
              "dosage": 3.5,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "0.5"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should group meds by ICD if same date and hosp', function () {
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
          "dosage": 63,
          "freq": "TIDPC PO",
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
          "dosage": 7,
          "freq": "TIDPC PO",
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
          "dosage": 70,
          "freq": "TIDPC PO",
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

    it('should group meds by days if same date, hosp, and ICD', function () {
      const input = {
        "rObject": [
          {
            "cdrug_dose_name": "濃縮顆粒劑",
            "cdrug_name": "“科達”小續命湯濃縮細粒",
            "cdrug_sosc": "08",
            "cdrug_sosc_name": "袪風之劑",
            "cure_e_date": null,
            "day": 14,
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
            "order_qty": 126,
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
          "days": 14,
          "dosage": 126,
          "freq": "TIDPC PO",
          "medications": [
            {
              "name": "小續命湯",
              "category": "袪風之劑",
              "dosage": 126,
              "frequency": "TIDPC PO",
              "days": 14,
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
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "dosage": 7,
          "freq": "TIDPC PO",
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
          "dosage": 70,
          "freq": "TIDPC PO",
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

    it('should group meds by freq if same date, hosp, ICD, and days', function () {
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
            "drug_fre": "HS PO",
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
          "dosage": 63,
          "freq": "TIDPC PO",
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
          "icd_code": "I679",
          "icd_name": "診斷欠明之腦血管疾病",
          "hosp": "測試院所",
          "visitType": "門診",
          "days": 7,
          "dosage": 7,
          "freq": "HS PO",
          "medications": [
            {
              "name": "延胡索",
              "category": null,
              "dosage": 7,
              "frequency": "HS PO",
              "days": 7,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "1",
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
          "dosage": 70,
          "freq": "TIDPC PO",
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

    it('should order by max days per hosp if same date', function () {
      const input = {
        "rObject": [
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A033312",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "止嗽散   ",
            "cdrug_sosc": "14",
            "cdrug_sosc_name": "袪痰之劑",
            "drug_fre": "TIDPC PO",
            "day": 3,
            "cdrug_dose_name": "濃縮散劑",
            "order_qty": 15,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“晉安”止嗽散濃縮散",
            "r": 91
          },
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A035578",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "甘草",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TIDPC PO",
            "day": 3,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 6,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“天明”甘草濃縮細粒",
            "r": 92
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "”仙豐”藿香正氣散濃縮散",
            "cdrug_sosc": "05",
            "cdrug_sosc_name": "和解之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "藿香正氣散(丸)",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A034408",
            "order_qty": 24.5,
            "r": 107
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "“仙豐”桔梗濃縮散",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "桔梗",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A042851",
            "order_qty": 3.5,
            "r": 108
          },
          {
            "hosp_id": "0000000002",
            "hosp": "院所乙;門診;0000000002",
            "icd_cname": "喉嚨痛",
            "order_code": "A033816",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "葛根",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TID",
            "day": 2,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 3,
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0046",
            "icd_code": "R070",
            "cdrug_name": "“港香蘭” 葛根濃縮細粒",
            "r": 36
          },
          {
            "hosp_id": "0000000002",
            "hosp": "院所乙;門診;0000000002",
            "icd_cname": "喉嚨痛",
            "order_code": "A045998",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "黃芩",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TID",
            "day": 2,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 0.6,
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0046",
            "icd_code": "R070",
            "cdrug_name": "“港香蘭”黃芩濃縮細粒",
            "r": 64
          },
        ]
      };
      const expected = [
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所乙",
          "visitType": "門診",
          "days": 7,
          "dosage": 28,
          "freq": "BIDPC",
          "medications": [
            {
              "name": "藿香正氣散(丸)",
              "category": "和解之劑",
              "dosage": 24.5,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "和解之劑",
              "perDosage": "1.8",
              "dailyDosage": "3.5"
            },
            {
              "name": "桔梗",
              "category": null,
              "dosage": 3.5,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "0.5"
            }
          ]
        },
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所乙",
          "visitType": "門診",
          "days": 2,
          "dosage": 3.6,
          "freq": "TID",
          "medications": [
            {
              "name": "葛根",
              "category": null,
              "dosage": 3,
              "frequency": "TID",
              "days": 2,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            },
            {
              "name": "黃芩",
              "category": null,
              "dosage": 0.6,
              "frequency": "TID",
              "days": 2,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.1",
              "dailyDosage": "0.3"
            }
          ]
        },
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所甲",
          "visitType": "門診",
          "days": 3,
          "dosage": 21,
          "freq": "TIDPC PO",
          "medications": [
            {
              "name": "止嗽散",
              "category": "袪痰之劑",
              "dosage": 15,
              "frequency": "TIDPC PO",
              "days": 3,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "袪痰之劑",
              "perDosage": "1.7",
              "dailyDosage": "5"
            },
            {
              "name": "甘草",
              "category": null,
              "dosage": 6,
              "frequency": "TIDPC PO",
              "days": 3,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.7",
              "dailyDosage": "2"
            }
          ]
        }
      ];
      const result = chineseMedProcessor.processChineseMedData(input);
      assert.deepEqual(result, expected);
    });

    it('should order by total dosage per hosp if same date and max days per hosp', function () {
      const input = {
        "rObject": [
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A033312",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "止嗽散   ",
            "cdrug_sosc": "14",
            "cdrug_sosc_name": "袪痰之劑",
            "drug_fre": "TIDPC PO",
            "day": 7,
            "cdrug_dose_name": "濃縮散劑",
            "order_qty": 21,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“晉安”止嗽散濃縮散",
            "r": 91
          },
          {
            "hosp_id": "0000000001",
            "hosp": "院所甲;門診;0000000001",
            "icd_cname": "喉嚨痛",
            "order_code": "A035578",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "甘草",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TIDPC PO",
            "day": 7,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 7,
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0005",
            "icd_code": "R070",
            "fee_ym": null,
            "cdrug_name": "“天明”甘草濃縮細粒",
            "r": 92
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "”仙豐”藿香正氣散濃縮散",
            "cdrug_sosc": "05",
            "cdrug_sosc_name": "和解之劑",
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "Y",
            "drug_perscrn_name": "藿香正氣散(丸)",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A034408",
            "order_qty": 21,
            "r": 107
          },
          {
            "cdrug_dose_name": "濃縮散劑",
            "cdrug_name": "“仙豐”桔梗濃縮散",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "cure_e_date": null,
            "day": 7,
            "drug_fre": "BIDPC",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "桔梗",
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "func_seq_no": "0024",
            "hosp": "院所乙;門診;0000000002",
            "hosp_id": "0000000002",
            "icd_cname": "喉嚨痛",
            "icd_code": "R070",
            "order_code": "A042851",
            "order_qty": 3.5,
            "r": 108
          },
          {
            "hosp_id": "0000000002",
            "hosp": "院所乙;門診;0000000002",
            "icd_cname": "喉嚨痛",
            "order_code": "A033816",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "葛根",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TID",
            "day": 4,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 6,
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0046",
            "icd_code": "R070",
            "cdrug_name": "“港香蘭” 葛根濃縮細粒",
            "r": 36
          },
          {
            "hosp_id": "0000000002",
            "hosp": "院所乙;門診;0000000002",
            "icd_cname": "喉嚨痛",
            "order_code": "A045998",
            "drug_multi_mark": "N",
            "drug_perscrn_name": "黃芩",
            "cdrug_sosc": null,
            "cdrug_sosc_name": null,
            "drug_fre": "TID",
            "day": 4,
            "cdrug_dose_name": "濃縮顆粒劑",
            "order_qty": 1.2,
            "fee_ym": "2024-07-01T00:00:00",
            "func_date": "2024-07-30T00:00:00",
            "cure_e_date": null,
            "func_seq_no": "0046",
            "icd_code": "R070",
            "cdrug_name": "“港香蘭”黃芩濃縮細粒",
            "r": 64
          },
        ]
      };
      const expected = [
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所乙",
          "visitType": "門診",
          "days": 7,
          "dosage": 24.5,
          "freq": "BIDPC",
          "medications": [
            {
              "name": "藿香正氣散(丸)",
              "category": "和解之劑",
              "dosage": 21,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "和解之劑",
              "perDosage": "1.5",
              "dailyDosage": "3"
            },
            {
              "name": "桔梗",
              "category": null,
              "dosage": 3.5,
              "frequency": "BIDPC",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.3",
              "dailyDosage": "0.5"
            }
          ]
        },
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所乙",
          "visitType": "門診",
          "days": 4,
          "dosage": 7.2,
          "freq": "TID",
          "medications": [
            {
              "name": "葛根",
              "category": null,
              "dosage": 6,
              "frequency": "TID",
              "days": 4,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.5",
              "dailyDosage": "1.5"
            },
            {
              "name": "黃芩",
              "category": null,
              "dosage": 1.2,
              "frequency": "TID",
              "days": 4,
              "type": "濃縮顆粒劑",
              "isMulti": false,
              "sosc_name": "",
              "perDosage": "0.1",
              "dailyDosage": "0.3"
            }
          ]
        },
        {
          "date": "2024/07/30",
          "icd_code": "R070",
          "icd_name": "喉嚨痛",
          "hosp": "院所甲",
          "visitType": "門診",
          "days": 7,
          "dosage": 28,
          "freq": "TIDPC PO",
          "medications": [
            {
              "name": "止嗽散",
              "category": "袪痰之劑",
              "dosage": 21,
              "frequency": "TIDPC PO",
              "days": 7,
              "type": "濃縮散劑",
              "isMulti": true,
              "sosc_name": "袪痰之劑",
              "perDosage": "1",
              "dailyDosage": "3"
            },
            {
              "name": "甘草",
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
          "dosage": 80.5,
          "freq": "TIDPC PO",
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
          "dosage": 80.5,
          "freq": "TIDPC PO",
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
          "dosage": 80.5,
          "freq": "TIDPC PO",
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
          "dosage": 80.5,
          "freq": "TIDPC PO",
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
          "dosage": 63,
          "freq": "TIDPC PO",
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

  describe.skip('.groupChineseMeds');

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

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "DAILY", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "QAM", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "QPM", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "QL", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "QN", 7), "2");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(84, "Q2H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(42, "Q4H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "Q6H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(21, "Q8H", 7), "1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "Q12H", 7), "1");
    });

    it('should correctly handle a frequency lower than daily', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "QOD", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(8, "QW", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(16, "BIW", 28), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(24, "TIW", 28), "2");
    });

    it('should round to 1st decimal', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(0.6, "TID", 2), "0.1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(13.5, "TID", 3), "1.5");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(24, "TID", 7), "1.1");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(40, "TID", 7), "1.9");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(10, "QOD", 7), "2.5");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(10, "BIW", 10), "3.3");
    });

    it('should return "SPECIAL" for special dosage', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "ST", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "STAT", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "ONCE", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "ASORDER", 7), "SPECIAL");

      // PRN-like
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRNB", 7), "SPECIAL");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRNQD", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRNBID", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRNTID", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRNQ6H", 7), "SPECIAL");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN QD", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN BID", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN TID", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "PRN Q6H", 7), "SPECIAL");

      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "需要時", 7), "SPECIAL");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "需要時BID", 7), "SPECIAL");
    });

    it('should ignore case', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "qd", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(28, "bid", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(42, "tid", 7), "2");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(56, "qid", 7), "2");
    });

    it('should return "SPECIAL" for undefined dosage', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(14, "UNKNOWN", 7), "SPECIAL");
    });

    it('should return "" for missing dosage, frequency, or days', function () {
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(null, "TID", 7), "");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(2.8, null, 7), "");
      assert.strictEqual(chineseMedProcessor.calculatePerDosage(2.8, "TID", null), "");
    });
  });

  describe.skip('.formatChineseMedData');

  describe.skip('.sortGroupedData');

  describe('.sortMedicationsByDosage', function () {
    it('should sort items by dosage', function () {
      let input;
      const expected = [
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
          "name": "杜仲",
          "category": null,
          "dosage": 14,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.7",
          "dailyDosage": "2"
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
        },
        {
          "name": "川芎",
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

      input = [
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
        },
        {
          "name": "川芎",
          "category": null,
          "dosage": 7,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.3",
          "dailyDosage": "1"
        },
        {
          "name": "杜仲",
          "category": null,
          "dosage": 14,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.7",
          "dailyDosage": "2"
        }
      ];
      assert.deepEqual(chineseMedProcessor.sortMedicationsByDosage(input), expected);

      input = [
        {
          "name": "杜仲",
          "category": null,
          "dosage": 14,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.7",
          "dailyDosage": "2"
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
        },
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
          "name": "川芎",
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
      assert.deepEqual(chineseMedProcessor.sortMedicationsByDosage(input), expected);
    });

    it('should not modify the input array', function () {
      const input = [
        {
          "name": "杜仲",
          "category": null,
          "dosage": 14,
          "frequency": "TIDPC PO",
          "days": 7,
          "type": "濃縮顆粒劑",
          "isMulti": false,
          "sosc_name": "",
          "perDosage": "0.7",
          "dailyDosage": "2"
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
        },
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
          "name": "川芎",
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
      const clone = JSON.parse(JSON.stringify(input));
      const result = chineseMedProcessor.sortMedicationsByDosage(input);
      assert.notDeepEqual(result, clone);
      assert.notStrictEqual(result, input);
      assert.deepEqual(input, clone);
    });
  });

  describe.skip('.getMedicationText');

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
        "freq": "TIDPC PO",
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
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯
延胡索`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameVertical', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯
延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameHorizontal', groupInfo),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯, 延胡索`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameHorizontal', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯, 延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', groupInfo),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯 9g - 袪風之劑
延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯 9g - 袪風之劑
延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯 9g
延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageVertical', {...groupInfo, showDiagnosis: false, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯 9g
延胡索 1g`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', groupInfo),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯 9g - 袪風之劑, 延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯 9g - 袪風之劑, 延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯 9g, 延胡索 1g`,
      );
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'nameWithDosageHorizontal', {...groupInfo, showDiagnosis: false, showEffectName: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯 9g, 延胡索 1g`,
      );

      // treat unknown as nameVertical
      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'unknown', groupInfo),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO [I679 診斷欠明之腦血管疾病]
小續命湯
延胡索`,
      );

      assert.deepEqual(
        chineseMedProcessor.formatChineseMedList(medications, 'unknown', {...groupInfo, showDiagnosis: false}),
        `\
2025/03/26 - 院所甲 7天 TIDPC PO
小續命湯
延胡索`,
      );
    });
  });
});
