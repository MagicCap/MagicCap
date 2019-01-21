#!/usr/bin/python2.7

from __future__ import print_function
import re
import json
import sys
import shutil

try:
    raw_input
except NameError:
    raw_input = input

all_lower = re.compile("^[a-z-]+$")

print("MagicCap internationalisation toolkit. Copyright (C) Jake Gealer <jake@gealer.email> 2019.")

while True:
    country_code = raw_input("What is the country code per ISO 639-1 (for example, en)? ").lower()
    if country_code == "":
        print("Country code cannot be blank.")
    elif not all_lower.match(country_code):
        print("Invalid country code.")
    else:
        break

while True:
    country_name = raw_input("What is the country name as you'd want it to show in the config (for example, English)? ")
    if country_name == "":
        print("Country name cannot be blank.")
    else:
        break

data = json.load(open("./lang_packs.json"))

if country_code in data:
    print("Country code already used.")
    sys.exit(1)

data[country_code] = country_name

open("./lang_packs.json", "w").write(json.dumps(data, indent=4))

shutil.copytree("./en", "./" + country_code)

print("./" + country_code + " created.")
