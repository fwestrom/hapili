#include "AckHandler.h"
#include "Debug.h"

AckHandler::AckHandler() {
}

void AckHandler::OnMessage(MessageContext &mc) {
    debugln("AckHandler::OnMessage");
    AckMessage ack(mc.getMessage());
    mc.Reply(ack);
}
