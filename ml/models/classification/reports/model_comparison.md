# Model Comparison — TF-IDF+LogReg vs DistilBERT

Both models evaluated on the **same** holdout (gold `test.parquet`, 19 categories)
and the **same** citizen-phrasing probe set.

## Headline metrics

| Metric | TF-IDF + LogReg | DistilBERT |
|--------|----------------:|-----------:|
| Accuracy (test) | 0.9930 | 0.9792 |
| Macro-F1 (test) | 0.9824 | 0.9626 |
| Weighted-F1 (test) | 0.9931 | 0.9790 |
| Precision macro (test) | 0.9842 | 0.9665 |
| Recall macro (test) | 0.9824 | 0.9606 |
| **Probe accuracy** (real text) | 0.3889 | 0.5556 |
| **Probe macro-F1** (real text) | 0.3525 | 0.4497 |
| Inference latency (ms/req) | 1.4 | 39.7 |
| Model size (MB) | 0.4 | 268.6 |

**Takeaway:** both models score highly on in-distribution 311 descriptors, but the
decisive difference is the **probe set** (arbitrary citizen phrasing), where the
transformer generalizes far better — at the cost of larger size and higher latency.
Macro-F1 is the primary selection metric (class imbalance).

## DistilBERT per-class metrics (test)

| Category | Precision | Recall | F1 | Support |
|----------|----------:|-------:|---:|--------:|
| Abandoned/Derelict Vehicle | 1.000 | 1.000 | 1.000 | 190 |
| Animal | 0.976 | 0.911 | 0.943 | 45 |
| Building/Apartment Condition | 0.959 | 0.988 | 0.974 | 431 |
| Business/Consumer | 0.947 | 0.947 | 0.947 | 170 |
| Electrical/Elevator | 1.000 | 0.975 | 0.987 | 80 |
| Environmental Hazard | 0.985 | 0.914 | 0.948 | 70 |
| Heat/Hot Water | 1.000 | 0.980 | 0.990 | 356 |
| Homeless/Encampment | 0.842 | 1.000 | 0.914 | 85 |
| Illegal Parking | 0.995 | 0.997 | 0.996 | 1020 |
| Noise | 0.996 | 1.000 | 0.998 | 1081 |
| Other | 0.906 | 0.773 | 0.835 | 75 |
| Plumbing/Water | 0.969 | 0.992 | 0.981 | 255 |
| Public Safety | 0.934 | 0.856 | 0.893 | 132 |
| Rodent/Pest | 0.985 | 1.000 | 0.992 | 64 |
| Sanitation | 0.991 | 0.955 | 0.972 | 443 |
| Sewer | 1.000 | 1.000 | 1.000 | 39 |
| Street Condition | 0.948 | 0.970 | 0.959 | 302 |
| Street Light | 0.978 | 1.000 | 0.989 | 44 |
| Tree | 0.952 | 0.992 | 0.971 | 120 |

## DistilBERT confusion matrix (test)

Rows = true, columns = predicted (label order below). Full CSVs for both models
are in `reports/{baseline,transformer}_confusion_matrix.csv`.

Labels: 0=Abandoned/Derelict Vehicle, 1=Animal, 2=Building/Apartment Condition, 3=Business/Consumer, 4=Electrical/Elevator, 5=Environmental Hazard, 6=Heat/Hot Water, 7=Homeless/Encampment, 8=Illegal Parking, 9=Noise, 10=Other, 11=Plumbing/Water, 12=Public Safety, 13=Rodent/Pest, 14=Sanitation, 15=Sewer, 16=Street Condition, 17=Street Light, 18=Tree

| true\pred | Abandoned/ | Animal | Building/A | Business/C | Electrical | Environmen | Heat/Hot W | Homeless/E | Illegal Pa | Noise | Other | Plumbing/W | Public Saf | Rodent/Pes | Sanitation | Sewer | Street Con | Street Lig | Tree |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Abandoned/Dereli | 190 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Animal | 0 | 41 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 0 |
| Building/Apartme | 0 | 0 | 426 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| Business/Consume | 0 | 0 | 2 | 161 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 4 | 0 | 0 |
| Electrical/Eleva | 0 | 0 | 0 | 0 | 78 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| Environmental Ha | 0 | 0 | 1 | 0 | 0 | 64 | 0 | 0 | 0 | 0 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Heat/Hot Water | 0 | 0 | 7 | 0 | 0 | 0 | 349 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Homeless/Encampm | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 85 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Illegal Parking | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1017 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| Noise | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1081 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Other | 0 | 1 | 0 | 2 | 0 | 0 | 0 | 3 | 0 | 1 | 58 | 2 | 0 | 1 | 2 | 0 | 5 | 0 | 0 |
| Plumbing/Water | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 253 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| Public Safety | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 13 | 2 | 0 | 0 | 0 | 113 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rodent/Pest | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 64 | 0 | 0 | 0 | 0 | 0 |
| Sanitation | 0 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 2 | 1 | 2 | 1 | 5 | 0 | 423 | 0 | 1 | 0 | 5 |
| Sewer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | 0 | 0 | 0 |
| Street Condition | 0 | 0 | 2 | 3 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 293 | 0 | 0 |
| Street Light | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 44 | 0 |
| Tree | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 119 |
