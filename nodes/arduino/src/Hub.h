#ifndef HUB_H
#define HUB_H

#include <vector>
#include "Handler.h"

class Hub : public Handler {
public:
    void Register(Handler *handler);
    virtual void OnMessage(MessageContext &mc);

private:
    std::vector<Handler*> handlers;
};

#endif
