#!/usr/bin/python2.7

from __future__ import print_function
from os.path import expanduser
import sqlite3
import os
import json

home = expanduser("~")

os.rename(home + "/magiccap.db", home + "/magiccap_captures.db")

db = sqlite3.connect(home + "/magiccap_captures.db")

cursor = db.cursor()

config = {}

for row in cursor.execute("SELECT * FROM config"):
    config[row[0]] = json.loads(row[1])

cursor.execute("DROP TABLE config")

open(home + "/magiccap.json", "w+").write(json.dumps(config))

print("Successfully migrated back to the legacy MagicCap database.")
