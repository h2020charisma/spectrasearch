import os
import string
import random
import json

folder_path = 'images'


def random_string(length=32):
    chars = "".join(
        [string.digits, string.ascii_letters, "!#$%&()*+,-./:;<=>?@[]^_`{|}~"]
    )
    return "".join(random.choices(chars, k=length)).strip()

data = []

for i in range(4):
    sample = {
        "value": random_string(32),
        "text": random_string(3),
        "imageLink": os.listdir(folder_path)[i]
    }
    data.append(sample)

json_data = json.dumps(data)
print(json_data)

