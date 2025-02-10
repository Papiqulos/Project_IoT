import mysql.connector

# Database connection details
db_config = {
    'host': '150.140.186.118',
    'port': 3306,
    'user': 'readonly_student',
    'password': 'iot_password',
    'database': 'default'
}

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
        for recvTime, attrValue in results:
            print(f"DateTime: {recvTime}, AttrValue: {attrValue}")

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    finally:
        # Close the cursor and connection
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# Example usage
# Fetch all noise data from the table for a specific time range
# fetch_data(
#     table_name="air_quality_lab_sensor_2_AirQualityObserved",
#     attr_name="relativeHumidity",
#     start_datetime="2024-10-31 23:57:00",
#     end_datetime="2025-11-10 00:03:00"
# )

fetch_data(
    table_name="AP_Estia_Rio_1_258773_AccessPoint",
    attr_name="measurement",
    start_datetime="2024-10-31 23:57:00",
    end_datetime="2025-11-10 00:03:00"
)