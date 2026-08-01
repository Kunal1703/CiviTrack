# NYC 311 — Data Quality Report

_Generated: 2026-07-29T19:17:49.653473+00:00_

## Pipeline summary
| Stage | Metric | Value |
|-------|--------|-------|
| Ingest | Rows fetched | 50,000 |
| Ingest | Requested limit | 50,000 |
| Ingest | Since date | 2024-01-01T00:00:00 |
| Clean | Input rows | 50,000 |
| Clean | Dropped (missing created_date) | 0 |
| Clean | Dropped (duplicates) | 0 |
| Clean | Output rows | 50,000 |
| Clean | Rows missing geo | 670 |
| Clean | Rows geo out-of-bounds | 0 |
| Clean | Rows with resolution time | 49,521 |
| Validate | Passed | True |
| Validate | Failure cases | 0 |
| Load | Table | `silver.complaints_311` |
| Load | Rows loaded | 50,000 |
| Load | Rows with geometry | 49,330 |

**Date range:** 2024-01-01 00:00:00 → 2024-01-06 13:53:47

## Missing values (silver)
|                  |   missing |   pct |
|:-----------------|----------:|------:|
| city             |      2014 |  4.03 |
| incident_address |      1472 |  2.94 |
| longitude        |       670 |  1.34 |
| latitude         |       670 |  1.34 |
| incident_zip     |       497 |  0.99 |
| resolution_hours |       479 |  0.96 |
| closed_date      |       473 |  0.95 |
| descriptor       |       253 |  0.51 |
| borough          |        37 |  0.07 |
| complaint_type   |         0 |  0    |
| agency           |         0 |  0    |
| unique_key       |         0 |  0    |
| created_date     |         0 |  0    |
| agency_name      |         0 |  0    |
| status           |         0 |  0    |
| geo_valid        |         0 |  0    |

## Top 10 complaint types
| complaint_type       |   count |
|:---------------------|--------:|
| HEAT/HOT WATER       |    7883 |
| Illegal Parking      |    7777 |
| Noise - Residential  |    4280 |
| Blocked Driveway     |    2838 |
| UNSANITARY CONDITION |    1879 |
| Abandoned Vehicle    |    1267 |
| PLUMBING             |    1131 |
| PAINT/PLASTER        |    1107 |
| Dirty Condition      |     889 |
| Street Condition     |     850 |

## Borough distribution
| borough       |   count |
|:--------------|--------:|
| BROOKLYN      |   16125 |
| QUEENS        |   11131 |
| BRONX         |   10609 |
| MANHATTAN     |   10285 |
| STATEN ISLAND |    1813 |
| <NA>          |      37 |

## Resolution time (hours) — closed complaints
|       |   resolution_hours |
|:------|-------------------:|
| count |           49521    |
| mean  |             330.38 |
| std   |            1245.2  |
| min   |               0    |
| 25%   |               1.01 |
| 50%   |              13.89 |
| 75%   |              84.14 |
| max   |           21180.6  |
