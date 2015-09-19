#ifndef ACKHANDLER_H
#define ACKHANDLER_H

#include "Handler.h"

class AckHandler : public Handler {
public:
    AckHandler();
    void OnMessage(MessageContext &mc);
};

#endif
