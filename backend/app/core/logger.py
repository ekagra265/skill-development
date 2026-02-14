from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


LOGGER_NAME = "agripulse"
LOG_FORMAT = "%(asctime)s | %(levelname)s | %(module)s | %(message)s"
LOG_FILE_PATH = Path(__file__).resolve().parents[2] / "logs" / "app.log"


def setup_logger() -> logging.Logger:
    # CHANGED: Single app-wide logger with console + rotating file output.
    logger_instance = logging.getLogger(LOGGER_NAME)
    if logger_instance.handlers:
        return logger_instance

    logger_instance.setLevel(logging.INFO)
    logger_instance.propagate = False

    LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(LOG_FORMAT)

    file_handler = RotatingFileHandler(
        LOG_FILE_PATH,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    logger_instance.addHandler(file_handler)
    logger_instance.addHandler(console_handler)
    return logger_instance


logger = setup_logger()
