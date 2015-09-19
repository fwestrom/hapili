#define DEBUG_SERIAL

#ifdef DEBUG_SERIAL
#define debuginit() (Serial.begin(115200))
#define debug(...) (Serial.print(__VA_ARGS__))
#define debugln(...) (Serial.println(__VA_ARGS__))
#else
#define debuginit()
#define debug(...)
#define debugln(...)
#endif
