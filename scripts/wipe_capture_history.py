#!/usr/bin/python2.7

from __future__ import print_function
from os.path import expanduser
import sqlite3

home = expanduser("~")

db = sqlite3.connect(home + "/magiccap.db")
cursor = db.cursor()
cursor.execute("DROP TABLE captures")

print("Capture history wiped. A reboot of MagicCap may be required.")
