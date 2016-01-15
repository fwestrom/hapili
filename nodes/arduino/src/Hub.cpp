#include "Hub.h"
#include "Debug.h"

void Hub::Register(Handler *handler) {
    handlers.push_back(handler);
}

void Hub::OnMessage(MessageContext &mc) {
    debugln("Hub::OnMessage");
    for (std::vector<Handler*>::iterator hi = handlers.begin(); hi != handlers.end(); ++hi) {
        Handler *handler = *hi;
        handler->OnMessage(mc);
    }
}
