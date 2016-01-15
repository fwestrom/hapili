#ifndef HANDLER_H
#define HANDLER_H

#include "HapiliMessage.h"

class MessageContext {
public:
    virtual HapiliMessage &getMessage() = 0;
    virtual void Reply(HapiliMessage &reply) = 0;
};

class Handler {
public:
    virtual void OnMessage(MessageContext &mc) = 0;
};

#endif
