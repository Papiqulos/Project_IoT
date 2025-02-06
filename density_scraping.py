from seleniumwire import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from bs4 import BeautifulSoup
import time
import csv
import pprint

url = "https://www.google.com/maps/place/OMNIA+downtown/@38.2525866,21.7342463,18.25z/data=!4m6!3m5!1s0x135e496e616ccce9:0x61c7fa4d6e47b844!8m2!3d38.2524013!4d21.7368184!16s%2Fg%2F11h7rgt98d?entry=ttu&g_ep=EgoyMDI1MDIwMy4wIKXMDSoASAFQAw%3D%3D"


service = Service(ChromeDriverManager().install())
options = webdriver.ChromeOptions()
options.add_argument('--disable-blink-features=AutomationControlled')
driver = webdriver.Chrome(service=service, options=options)

driver.get(url)


try: 
    button = driver.find_element(By.XPATH, '//*[@id="yDmH0d"]/c-wiz/div/div/div/div[2]/div[1]/div[3]/div[1]/div[1]/form[2]/div/div/button' ) 
    button.click()
    print("Clicked consent to cookies.")
    # Get the html of the page when the consent button is clicked
    html = driver.page_source
    soup = BeautifulSoup(html, 'html.parser')
    # Get the places' opening days
    days_elements = soup.find_all(class_=lambda class_name: class_name and 'ylH6lf' in class_name)
    days = [element.text for element in days_elements]
    # print(days_aria_labels)

    # Get the places' opening hours
    hours_elements = soup.find_all(class_='mxowUb')
    hours = [element.get('aria-label') for element in hours_elements]
    schedule = {}
    for i in range(len(days)):
        schedule[days[i]] = hours[i]
    
    crowd_density = {}
    for i, (day, opening_hours) in enumerate(schedule.items()):
        # print(day, opening_hours)
        if  opening_hours != "Κλειστά" and opening_hours != "Closed":
            crowd_density[day] = []
        


    # Arrange the days starting with Κυριακή 
    ordered_days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']
    crowd_density = {day: crowd_density[day] for day in ordered_days if day in crowd_density}

    # Find all classes that contain 'g2BVhd' in their name
    densities_element = soup.find_all(class_=lambda class_name: class_name and 'g2BVhd' in class_name)
    for day_element in densities_element:
        # Find the class name of the first child
        first_child = day_element.findChildren()[0] 
        if first_child.get('class')[0] == "c3RoDe":
            continue

    # Find how many children each element with class name
    densities_children = [len(element.findChildren()) for element in densities_element]
    densities_children.sort()
    hours_length = densities_children[-2] / 3

    # Find all classes that contain 'dpoVLd' in their name
    densities_element = soup.find_all(class_=lambda class_name: class_name and 'dpoVLd' in class_name)
    densities_aria_labels = [element.get('aria-label') for element in densities_element]
    day_index = -1
    for i, aria_label in enumerate(densities_aria_labels):
        if i % hours_length == 0:
            day_index += 1
        
        crowd_density[list(crowd_density.keys())[day_index]].append(aria_label)
            



            
    # pprint.pprint(crowd_density)
     
except Exception as e: 
    print(e)