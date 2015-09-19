#ifndef CONFIGUREHANDLER_H
#define CONFIGUREHANDLER_H

#include "Handler.h"

class ConfigureHandler : public Handler {
public:
    virtual void OnMessage(MessageContext &mc);
};

#endif
