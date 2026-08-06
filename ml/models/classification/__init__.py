"""CiviTrack AI — complaint text classification (M1).

The pipeline is deliberately organized around a *source-agnostic* text field:
training currently uses NYC 311 `descriptor`, but the preprocessing and the
dataset loader are decoupled so a richer free-text corpus can replace it by
changing a single config value (`ClassifierConfig.text_column`).
"""
