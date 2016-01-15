#include "ConfigureHandler.h"
#include "Debug.h"

void ConfigureHandler::OnMessage(MessageContext &mc) {
    if (mc.getMessage().getType() != HapiliMessage::Configure) {
        return;
    }

    debugln("ConfigureHandler::OnMessage|TODO");
}
