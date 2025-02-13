import paho.mqtt.client as mqtt_client
import random 
import json
import datetime
import requests
import datetime
import co2_points
import ap_points
from influxdb_client import InfluxDBClient, Point, WritePrecision
import math
import sys
import subprocess

broker = '150.140.186.118'
port = 1883
client_id = 'rand_id' +str(random.random())
topic = "json/Room monitoring/#"  # Specify the topic you'd like to subscribe to

influxdb_url = "http://150.140.186.118:8086"
bucket = "datacrowd"
org = "students"
token = "gO6frV-yywRPgOQ0RwrWHoU_PntkKzZ80oAPbkEDN08geoy8-zubHDVT7K67pY-r3SBaHv6X1SkDjxvTsbU8qQ=="
measurement = "co2_data"

# Create InfluxDB client
client = InfluxDBClient(url=influxdb_url, token=token, org=org)
write_api = client.write_api()  # No need to pass WritePrecision here


def log_message(message):
    try:
        log_file_path = "../Jarvis/log.txt"
        log_script_path = "../Jarvis/log_message.py"
        with open(log_file_path, "w") as f:
            f.write(message)
            f.write("\n")
        subprocess.run([sys.executable, log_script_path])
    except Exception as e:
        print("Error in log_message: ", e)
    
    



def create_air_quality_json(id, type, dateObserved, location, typeOfLocation, relativeHumidity, temperature, co2):
    data = {
        # "id": id,
        # "type": type,
        "dateObserved": {
            "type": "DateTime",
            "value": dateObserved.split(".")[0]
            },
        "location": {
            "type": "geo:json",
            "value": {
                "type": "Point",
                "coordinates": location
                }
        },
        "typeOfLocation": {
            "type": "Text",
            "value": typeOfLocation
        },
        "relativeHumidity": {
            "type": "Number",
            "value": relativeHumidity
        },
        "temperature": {
            "type": "Number",
            "value": temperature,
            },
        
        "reliability": {
            "type": "Number",
            "value": 1
        },
        "co2": {
            "type": "Number",
            "value": co2,
            "metadata": {
            "unitCode": {
                "value": "ppm"
                }
            }
        },

    }
    return data

def create_ap_json(id, type, dateObserved, location, typeOfLocation, macs_list):
    data = {
        "dateObserved": {
            "type": "DateTime",
            "value": dateObserved
            },
        "location": {
            "type": "geo:json",
            "value": {
                "type": "Point",
                "coordinates": location
                }
        },
        "typeOfLocation": {
            "type": "Text",
            "value": typeOfLocation
        },
        "macs": {
            "type": "Text",
            "value": macs_list
        },
        "reliability": {
            "type": "Number",
            "value": 1
        }
    }
    return data

def write_to_influxdb_climate(data, sensor_id, fake = False):
    name = ("air_quality_sensor_"+str(sensor_id)) if fake else sensor_id
    point = Point(name).field(
        "co2", data['object']['CO2']).field("temperature", data['object']['sensorTemperature']).field(
        "humidity", data['object']['relativeHumidity']
        ).time(datetime.datetime.now()+datetime.timedelta(hours=2), WritePrecision.NS)
    # print(point.to_line_protocol())
    # write_api.write(bucket, org, point)

def write_to_influxdb_ap(data, sensor_id, macs,fake = False):
    name = ("ap_"+str(sensor_id)) if fake else sensor_id
    value = len(macs)
    # print(value, macs)
    point = Point(name).field("value", value).time(
        datetime.datetime.now()+datetime.timedelta(hours = 2), WritePrecision.NS)
    # print(len(data['macs'])//(10 if fake else 1))
    # print(point.to_line_protocol())

    # write_api.write(bucket, org, point)

def fake_data_climate():
    curve = [0, 0, 0, 1, 1, 1, 2, 2, 4, 5, 7, 8, 9, 10, 8, 5, 4, 4, 3, 3, 2, 2, 1, 1]
    hour = datetime.datetime.now().hour
    points = co2_points.points
    all_good = True
    for i,p in enumerate(points):
        if random.random() < 0.15:
            
            shift = i%24
        else:
            shift = 0
        data = {
            "time": str(datetime.datetime.now().isoformat()),
            "object": {
                "relativeHumidity": 30+curve[(hour+shift)%24]*random.random()*3,
                "sensorTemperature": 10+curve[hour]*2*(random.random()**0.5),
                "CO2": 400+curve[(hour+shift)%24]*random.random()*30
            }
        }
        write_to_influxdb_climate(data, p[2], fake = True)
        out_data = create_air_quality_json(str(p[2]), "AirQualityObserved", data['time'], p[:2], "indoor", data['object']['relativeHumidity'], data['object']['sensorTemperature'], data['object']['CO2'])
        url = f"http://150.140.186.118:1026/v2/entities/{str(p[2])}/attrs"
        headers = {
            "Content-Type": "application/json"
        }
        response = requests.patch(url, json=out_data, headers=headers)

        if response.status_code == 204:
            # print("Co2 sensors data updated successfully!", data['time'])
            pass
        else:
            print(f"Failed to update entity: {response.status_code}")
            print(response.json())
            all_good = False
        # return
    if all_good:
        print("Co2 sensors data updated successfully!", data['time'])
        


def fake_data_ap():
    curve = [0, 0, 0, 1, 1, 1, 2, 2, 4, 5, 7, 8, 9, 10, 8, 5, 4, 4, 3, 3, 2, 2, 1, 1]
    hour = datetime.datetime.now().hour
    points = ap_points.points
    all_good = True
    for i,p in enumerate(points):
        if random.random() < 0.20:
            
            shift = i%24
        else:
            shift = 0
        number_of_macs = 5+curve[(hour+shift)%24]*7
        macs = []
        for i in range(number_of_macs):
            macs.append(str(random.randint(0, 100000000)))
        # print(str(datetime.datetime.now()).split(".")[0])
        data = create_ap_json("ap_"+str(p[2]), "AccessPoint", str(datetime.datetime.now().isoformat()), p[:2], "outdoor", macs)
        # print(len(macs), macs)
        write_to_influxdb_ap(data, p[2],macs, fake = True)

        url = f"http://150.140.186.118:1026/v2/entities/{'ap_'+str(p[2])}/attrs"
        headers = {
            "Content-Type": "application/json"
        }
        # print(url)
        response = requests.patch(url, json=data, headers=headers)

        if response.status_code == 204:
            # print("AP data updated successfully!", )
            pass
        else:
            print(f"Failed to update entity: {response.status_code}")
            print(response.json())
            all_good = False
        # return
    if all_good:
        print("AP data updated successfully!", str(datetime.datetime.now()).split(".")[0])

def real_data_ap():
    pass

# fake_data_ap()
# fake_data_climate()


def connect_mqtt():
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"Connected to MQTT Broker! {datetime.datetime.now()}")
            log_message(f"Connected to MQTT Broker! {datetime.datetime.now()}")
        else:
            print(f"Failed to connect, return code {rc}\n")

    client = mqtt_client.Client(client_id)
    # client.username_pw_set(username, password)  # Uncomment if username/password is required
    client.on_connect = on_connect
    client.connect(broker, port)
    return client

def subscribe(client):
    def on_message(client, userdata, msg):
        # print(f"topic: {msg.topic}")
        # return
        if "co2-sensor:1" in msg.topic:
            fake_data_ap()
            fake_data_climate()

            inp = msg.payload.decode()


            try:
                data = json.loads(inp)

                out_data = create_air_quality_json("air_quality_lab_sensor_1",
                                                    "AirQualityObserved",
                                                    data['time'],
                                                    [38.288275, 21.788986],
                                                    "indoor",
                                                    data['object']['relativeHumidity'],
                                                    data['object']['sensorTemperature'],
                                                    data['object']['CO2'])
                url = "http://150.140.186.118:1026/v2/entities/air_quality_lab_sensor_1/attrs"
                headers = {
                    "Content-Type": "application/json"
                }
                response = requests.patch(url, json=out_data, headers=headers)
                write_to_influxdb_climate(data, "air_quality_sensor_lab_1", fake = False)

                if response.status_code == 204:
                    print("Co2 sensor 1 data updated successfully!", data['time'])
                    pass
                else:
                    print(f"Failed to update entity: {response.status_code}")
                    print(response.json())


            except Exception as e:
                print(e)
                print("Error in json parsing")
                print("sensor 1 data: ", data)
                print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
        
        elif "co2-sensor:2" in msg.topic:
            inp = msg.payload.decode()
            try:
                data = json.loads(inp)
                values = data['object']
                out_data = create_air_quality_json("air_quality_lab_sensor_2",
                                                    "AirQualityObserved",
                                                    data['time'],
                                                    [38.288278, 21.788883],
                                                    "indoor",
                                                    values['relativeHumidity'],
                                                    values['sensorTemperature'],
                                                    values['CO2'])

                url = "http://150.140.186.118:1026/v2/entities/air_quality_lab_sensor_2/attrs"
                headers = {
                    "Content-Type": "application/json"
                }
                response = requests.patch(url, json=out_data, headers=headers)
                write_to_influxdb_climate(data, "air_quality_sensor_lab_2", fake = False)

                if response.status_code == 204:
                    # print("Entity updated successfully!")
                    print("Co2 sensor 2 data updated successfully!", data['time'])
                    pass
                else:
                    print(f"Failed to update entity: {response.status_code}")
                    print(response.json())
            except Exception as e:
                print(e)
                print("Error in json parsing")
                print("sensor 2 data: ", data)
                print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

        

    client.subscribe(topic)
    client.on_message = on_message

def run():
    client = connect_mqtt()
    subscribe(client)
    client.loop_forever()  # Keep the client connected and listening for messages

if __name__ == '__main__':
    run()
