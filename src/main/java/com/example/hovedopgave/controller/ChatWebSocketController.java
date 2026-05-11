package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.ChatMessageRequest;
import com.example.hovedopgave.dto.ChatMessageResponse;
import com.example.hovedopgave.dto.ChatRealtimeMessageRequest;
import com.example.hovedopgave.service.GroupService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private final GroupService groupService;
    private final SimpMessagingTemplate simpMessagingTemplate;

    public ChatWebSocketController(
            GroupService groupService,
            SimpMessagingTemplate simpMessagingTemplate
    ) {
        this.groupService = groupService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @MessageMapping("/groups/{groupId}/send")
    public void sendMessage(
            @DestinationVariable Integer groupId,
            ChatRealtimeMessageRequest request
    ) {
        ChatMessageResponse response = groupService.saveMessage(
                groupId,
                new ChatMessageRequest(request.userId(), request.message())
        );

        simpMessagingTemplate.convertAndSend("/topic/groups/" + groupId, response);
    }
}
