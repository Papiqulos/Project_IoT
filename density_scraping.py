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
import datetime

# url = "https://www.google.com/maps/place/OMNIA+downtown/@38.2525866,21.7342463,18.25z/data=!4m6!3m5!1s0x135e496e616ccce9:0x61c7fa4d6e47b844!8m2!3d38.2524013!4d21.7368184!16s%2Fg%2F11h7rgt98d?entry=ttu&g_ep=EgoyMDI1MDIwMy4wIKXMDSoASAFQAw%3D%3D"
url = "https://www.google.com/maps/place/ZARA/@38.2478515,21.72607,15z/data=!4m6!3m5!1s0x135e49dd465bafa7:0x731033e8a59cc62d!8m2!3d38.2478507!4d21.7363707!16s%2Fg%2F1tdhw2nm?entry=ttu&g_ep=EgoyMDI1MDIwMy4wIKXMDSoJLDEwMjExMjMzSAFQAw%3D%3D"

service = Service(ChromeDriverManager().install())
options = webdriver.ChromeOptions()
options.add_argument('--disable-blink-features=AutomationControlled')
driver = webdriver.Chrome(service=service, options=options)

driver.get(url)



button = driver.find_element(By.XPATH, '//*[@id="yDmH0d"]/c-wiz/div/div/div/div[2]/div[1]/div[3]/div[1]/div[1]/form[2]/div/div/button' ) 
button.click()
print("Clicked consent to cookies.")
# Get the html of the page when the consent button is clicked
html = driver.page_source
soup = BeautifulSoup(html, 'html.parser')
# Get the places' opening days
days_elements = soup.find_all(class_=lambda class_name: class_name and 'ylH6lf' in class_name)
days = [element.text for element in days_elements]
print(days)
# exit()
# print(days_aria_labels)


hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
density_schedule ={
    "Κυριακή": [0 for _ in hours],
    "Δευτέρα": [0 for _ in hours],
    "Τρίτη": [0 for _ in hours],
    "Τετάρτη": [0 for _ in hours],
    "Πέμπτη": [0 for _ in hours],
    "Παρασκευή": [0 for _ in hours],
    "Σάββατο": [0 for _ in hours],    
}

    


# Arrange the days starting with Κυριακή 
ordered_days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']


# Find all classes that contain 'g2BVhd' in their name == day elements
densities_element = soup.find_all(class_=lambda class_name: class_name and 'g2BVhd' in class_name)
previous_hour = 0
for i, day_element in enumerate(densities_element):

    first_child = day_element.findChildren()[0] 
    if first_child.get('class')[0] == "c3RoDe":
        del density_schedule[ordered_days[i]]

    else:
        hour_elements = day_element.find_all(class_=lambda class_name: class_name and 'dpoVLd' in class_name)
        day_name = ordered_days[i]
        # density_schedule[day_name] = [0 for _ in hours]
        for hour_element in hour_elements:
            # print(hour_element.get('aria-label'))
            element = hour_element.get('aria-label')

            if "παρόντος" in element:
                element = element.replace("Επί του παρόντος ", "")
                current_percentage = int(element.split("%")[0])
                rest_of_the_element = element.split(", συνήθως ")[1]
                hour_percentage = int(rest_of_the_element.split("%")[0])
                hour = previous_hour+1
                density_schedule[day_name][hour] = hour_percentage
                continue
            
            percentage = int(element.split("%")[0])
            # hour = ( int(element.split(" ")[-1].split("\u202f")[0]) + 12*("μ.μ" in element))%24
            hour = int(element.split(" ")[-1].split("\u202f")[0])
            if "μ.μ" in element and hour < 12:
                hour += 12
                hour %= 24
            if "π.μ" in element and hour == 12:
                hour = 0
            previous_hour = hour
            density_schedule[day_name][hour] = percentage

pprint.pprint(density_schedule)

exit()