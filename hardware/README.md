# Setup
Assumptions: the microcontroller is plugged into the computer 
1. Use VsCode
2. Download the PlatformIO extension
3. Download the ESP-IDF extension
4. Complete the ESP-IDF download in the extension
5. Create a project in PlatformIO
6. Setting up the infra to flash code onto the MicroController 
    - cmd + shift + p -> ESP-IDF: Open ESP-IDF Terminal
    - terminal -> idf.py set-target esp32c6
    - terminal -> idf.py build
    - terminal -> idf.py flash monitor 
7. Code should be on the chip now, and it should be doing whatever you told it to do. If not then ask Jason. 
