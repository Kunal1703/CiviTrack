"""Data validation for the silver layer (pandera).

Chosen over Great Expectations for M0: lighter, code-first, and sufficient for a
schema + basic sanity checks. Validation is *lazy* so we collect every failure
in one pass for the data-quality report rather than aborting on the first.
"""

from __future__ import annotations

import logging

import pandas as pd

try:  # pandera >= 0.20 splits backends into pandera.pandas
    import pandera.pandas as pa
    from pandera.pandas import Column, DataFrameSchema
except ImportError:  # older pandera
    import pandera as pa
    from pandera import Column, DataFrameSchema

logger = logging.getLogger("pipeline.validate")

SILVER_SCHEMA = DataFrameSchema(
    {
        "unique_key": Column(str, nullable=False, unique=True, coerce=True),
        "created_date": Column("datetime64[ns]", nullable=False),
        "complaint_type": Column(str, nullable=True, coerce=True),
        "status": Column(str, nullable=True, coerce=True),
        "latitude": Column(
            float, nullable=True, checks=pa.Check.in_range(40.40, 41.10)
        ),
        "longitude": Column(
            float, nullable=True, checks=pa.Check.in_range(-74.30, -73.60)
        ),
        "resolution_hours": Column(
            float, nullable=True, checks=pa.Check.ge(0)
        ),
    },
    strict=False,  # allow extra canonical columns
    coerce=True,
)


def validate_silver(df: pd.DataFrame) -> dict:
    """Validate silver data. Returns a report dict (never raises)."""
    report: dict[str, object] = {"passed": True, "failure_cases": 0, "failures": []}
    # Validate only rows with in-bounds geo against the range checks; out-of-bounds
    # coords are already flagged (geo_valid=False) and expected.
    df_check = df.copy()
    df_check.loc[~df_check["geo_valid"].fillna(False), ["latitude", "longitude"]] = pd.NA
    try:
        SILVER_SCHEMA.validate(df_check, lazy=True)
        logger.info("Silver validation passed (%s rows)", len(df))
    except pa.errors.SchemaErrors as err:
        cases = err.failure_cases
        report["passed"] = False
        report["failure_cases"] = int(len(cases))
        report["failures"] = (
            cases.groupby("check").size().reset_index(name="count").to_dict("records")
        )
        logger.warning("Silver validation found %s failure cases", len(cases))
    return report
