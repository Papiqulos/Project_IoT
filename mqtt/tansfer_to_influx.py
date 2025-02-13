import mysql.connector
from influxdb_client import InfluxDBClient, Point, WritePrecision
import pandas as pd
import json
import datetime
import ap_points
import co2_points
import time as t
from influxdb_client.client.write_api import SYNCHRONOUS
last_time = "2025-02-08 00:01:00"
# Database connection details
db_config = {
    'host': '150.140.186.118',
    'port': 3306,
    'user': 'readonly_student',
    'password': 'iot_password',
    'database': 'default'
}

influxdb_url = "http://150.140.186.118:8086"
bucket = "datacrowd"
org = "students"
token = "gO6frV-yywRPgOQ0RwrWHoU_PntkKzZ80oAPbkEDN08geoy8-zubHDVT7K67pY-r3SBaHv6X1SkDjxvTsbU8qQ=="


client = InfluxDBClient(url=influxdb_url, token=token, org=org)
write_api = client.write_api()  # No need to pass WritePrecision here


def fetch_data(table_name, attr_name, start_datetime=None, end_datetime=None):
    """
    Fetches recvTime and attrValue from the specified table for rows where attrName matches 
    and recvTime is between start_datetime and end_datetime.

    Parameters:
    - table_name (str): The name of the table to query.
    - attr_name (str): The attribute name to filter on.
    - start_datetime (str or None): The start datetime (inclusive) in "YYYY-MM-DD HH:MM:SS" format. Defaults to None.
    - end_datetime (str or None): The end datetime (inclusive) in "YYYY-MM-DD HH:MM:SS" format. Defaults to None.
    
    Returns:
    - list of tuples: Each tuple contains (recvTime, attrValue) for each matching row.
    """
    try:
        # Establish the connection to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        # Define the base query
        query = f"""
            SELECT recvTime, attrValue
            FROM {table_name}
            WHERE attrName = %s
        """

        # Define parameters for the query
        params = [attr_name]

        # Add datetime filtering if start and end datetimes are provided
        if start_datetime:
            query += " AND recvTime >= %s"
            params.append(start_datetime)
        if end_datetime:
            query += " AND recvTime <= %s"
            params.append(end_datetime)

        # Execute the query with the parameters
        cursor.execute(query, params)

        # Fetch and return the results
        results = cursor.fetchall()
        # for recvTime, attrValue in results:
            # print(f"DateTime: {recvTime}, AttrValue: {attrValue}")
        return results

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    finally:
        # Close the cursor and connection
        if cursor:
            cursor.close()
        if connection:
            connection.close()



def ap_estia():
    print("Fetching data from the database...")
    results = fetch_data(
        table_name="WLC_LESXI_WLCdata",
        attr_name="csvData",
        start_datetime="2025-02-08 00:01:00",
        end_datetime=last_time
    )
    print(f"Data fetched successfully {len(results)}.")
    pd.DataFrame(results).to_csv("big_data.csv")
    # return
    data = pd.read_csv("big_data.csv")
    first_row = True
    counter = 0
    specific_counter = 0
    building_times = {}
    
    for row in data[::-1].iterrows():
        buildings_counter = {}
        if first_row:
            first_row = False
            continue
        counter += 1


        measurement_time = row[1][1]
        time_obj = datetime.datetime.strptime(measurement_time, "%Y-%m-%d %H:%M:%S.%f")
        # Add 2 hours
        new_time_obj = time_obj + datetime.timedelta(hours=2)
        new_time = new_time_obj.strftime("%Y-%m-%d %H:%M:%S")



        payload = row[1][2]
        try:
            macs = json.loads(payload)["2"]["value"]
            buildings = json.loads(payload)["4"]["value"]
        except:
            print("Error in row", counter)
            continue
        for mac, building in zip(macs, buildings):
            if building not in buildings_counter:
                buildings_counter[building] = 0
            buildings_counter[building] += 1
            # point = Point(measurement).tag("mac", mac).tag("building", building).field("value", 1).time(time, WritePrecision.NS)
            # write_api.write(bucket=bucket, org=org, record=point)
            # print(f"Written data: {mac}, {building}")
            
        for building, count in buildings_counter.items():

            # print("ap_"+building, count)
            # print(building,)
            # continue
            point = Point("ap_"+building).field("value", int(count)).time(new_time, WritePrecision.NS)

            write_api.write(bucket=bucket, org=org, record=point)
        # exit()
    # exit()
    # write_api.__del__()

def ap_fake():

    for point in ap_points.points:
        print("Fetching data from the database...")
        results = fetch_data(
            table_name=f"ap_{point[2]}_Thing",
            attr_name="macs",
            start_datetime=last_time,
            end_datetime=""
        )
        # print(f"Data fetched successfully {len(results)}.")
        for res in results:
            time = res[0]
            value = len(res[1])//10
            print("ap_"+point[2],time,  )
            old_time_obj = datetime.datetime.strptime(time, "%Y-%m-%d %H:%M:%S.%f")    
            new_time_obj = old_time_obj + datetime.timedelta(hours=2)
            new_time = new_time_obj.strftime("%Y-%m-%d %H:%M:%S.%f")
            
            data_point = Point("ap_"+point[2]).field("value", value).time(time, WritePrecision.NS)
            # print("ap_"+point[2], value, time)
            write_api.write(bucket=bucket, org=org, record=data_point)

    # write_api.__del__()

def co2_fake():

    for point in co2_points.points:
        print("Fetching data from the database...")
        results_co2 = fetch_data(
            table_name=f"{point[2]}_AirQualityObserved",
            attr_name="co2",
            start_datetime=last_time,
            end_datetime=""
        )
        results_humidity = fetch_data(
            table_name=f"{point[2]}_AirQualityObserved",
            attr_name="relativeHumidity",
            start_datetime=last_time,
            end_datetime=""
        )
        results_temperature = fetch_data(
            table_name=f"{point[2]}_AirQualityObserved",
            attr_name="temperature",
            start_datetime=last_time,
            end_datetime=""
        )

        # print(f"Data fetched successfully {len(results)}.")
        for i in range(len(results_co2)):
            time = results_co2[i][0]
            co2 = results_co2[i][1]
            humidity = results_humidity[i][1]
            temperature = results_temperature[i][1]
            print(f"temperature: {temperature}")
            # print(f"{time} {co2} {humidity} {temperature}")
            old_time_obj = datetime.datetime.strptime(time, "%Y-%m-%d %H:%M:%S.%f")
            new_time_obj = old_time_obj + datetime.timedelta(hours=2)
            new_time = new_time_obj.strftime("%Y-%m-%d %H:%M:%S.%f")

            data_point = Point("air_quality_sensor_"+point[2]).field("co2", float(co2)).field("humidity", float(humidity)).field("temperature", float(temperature)).time(new_time, WritePrecision.NS)
            print("air_quality_"+point[2], co2, humidity, temperature, new_time)
            write_api.write(bucket=bucket, org=org, record=data_point)


def co2_lab():
    lst = ["air_quality_lab_sensor_1_AirQualityObserved", "air_quality_lab_sensor_2_AirQualityObserved"]
    
    for table in lst:
        results_co2 = fetch_data(
            table_name=table,
            attr_name="co2",
            start_datetime=last_time,
            end_datetime=""
        )
        results_humidity = fetch_data(
            table_name=table,
            attr_name="relativeHumidity",
            start_datetime=last_time,
            end_datetime=""
        )
        results_temperature = fetch_data(
            table_name=table,
            attr_name="temperature",
            start_datetime=last_time,
            end_datetime=""
        )

        # print(f"Data fetched successfully {len(results_co2)}.")
        # t.sleep(2)

        for i in range(len(results_co2)):
            
            time = results_co2[i][0]
            co2 = results_co2[i][1]
            humidity = results_humidity[i][1]
            temperature = results_temperature[i][1]
            # print(f"{time} {co2} {humidity} {temperature} hhhh")

            old_time_obj = datetime.datetime.strptime(time, "%Y-%m-%d %H:%M:%S.%f")
            new_time_obj = old_time_obj + datetime.timedelta(hours=2)
            new_time = new_time_obj.strftime("%Y-%m-%d %H:%M:%S.%f")
            if i%100 == 0:
                print(new_time, table)
            name = "air_quality_sensor_lab_1" if table == "air_quality_lab_sensor_1_AirQualityObserved" else "air_quality_sensor_lab_2"
            data_point = Point(name).field("co2", float(co2)).field("humidity", float(humidity)).field("temperature", float(temperature)).time(new_time, WritePrecision.NS)
            write_api.write(bucket=bucket, org=org, record=data_point)

        
        
ap_estia()
ap_fake()
co2_fake()
co2_lab()

    
t.sleep(60)

