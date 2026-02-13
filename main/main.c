#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

#define PIN_SENSOR GPIO_NUM_4
#define PIN_R GPIO_NUM_2
#define PIN_G GPIO_NUM_3
#define PIN_B GPIO_NUM_10

bool seat_occupied = false;

static void set_rgb(int r, int g, int b) {
    gpio_set_level(PIN_R, r);
    gpio_set_level(PIN_G, g);
    gpio_set_level(PIN_B, b);
}

void app_main(void) {
    gpio_reset_pin(PIN_R);
    gpio_reset_pin(PIN_G);
    gpio_reset_pin(PIN_B);
    gpio_reset_pin(PIN_SENSOR);

    gpio_set_direction(PIN_R, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_G, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_B, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_SENSOR, GPIO_MODE_INPUT);
    gpio_set_pull_mode(PIN_SENSOR, GPIO_PULLUP_ONLY);

    // while (1) {
    //     set_rgb(1,0,0); vTaskDelay(pdMS_TO_TICKS(500));
    //     set_rgb(0,1,0); vTaskDelay(pdMS_TO_TICKS(500));
    //     set_rgb(0,0,1); vTaskDelay(pdMS_TO_TICKS(500));
    //     set_rgb(1,1,1); vTaskDelay(pdMS_TO_TICKS(500));
    //     set_rgb(0,0,0); vTaskDelay(pdMS_TO_TICKS(500));
    // }

    while (1) {
        seat_occupied = gpio_get_level(PIN_SENSOR);
        if (seat_occupied) {
            set_rgb(1,0,0);
        } else {
            set_rgb(0,1,0);
        }
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}
