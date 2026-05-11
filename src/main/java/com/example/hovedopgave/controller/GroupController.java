package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.ChatGroupCreateRequest;
import com.example.hovedopgave.dto.ChatGroupJoinRequest;
import com.example.hovedopgave.dto.ChatGroupResponse;
import com.example.hovedopgave.dto.ChatMessageRequest;
import com.example.hovedopgave.dto.ChatMessageResponse;
import com.example.hovedopgave.dto.ChatOverviewResponse;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final SimpMessagingTemplate simpMessagingTemplate;

    public GroupController(GroupService groupService, SimpMessagingTemplate simpMessagingTemplate) {
        this.groupService = groupService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @GetMapping
    public ChatOverviewResponse getGroups(@RequestParam Integer userId) {
        return groupService.getChatOverview(userId);
    }

    @GetMapping("/my")
    public List<ChatGroupResponse> getMyGroups(@RequestParam Integer userId) {
        return groupService.getJoinedGroups(userId);
    }

    @GetMapping("/{groupId}/messages")
    public List<ChatMessageResponse> getMessages(
            @PathVariable Integer groupId,
            @RequestParam Integer userId
    ) {
        return groupService.getMessages(groupId, userId);
    }

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<ChatMessageResponse> createMessage(
            @PathVariable Integer groupId,
            @RequestBody ChatMessageRequest request
    ) {
        ChatMessageResponse response = groupService.saveMessage(groupId, request);
        simpMessagingTemplate.convertAndSend("/topic/groups/" + groupId, response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping
    public ResponseEntity<ChatGroupResponse> createGroup(@RequestBody ChatGroupCreateRequest request) {
        ChatGroupResponse response = groupService.createGroup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<ChatGroupResponse> joinGroup(
            @PathVariable Integer groupId,
            @RequestBody ChatGroupJoinRequest request
    ) {
        ChatGroupResponse response = groupService.joinGroup(groupId, request.userId());
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(GroupService.GroupValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleGroupValidationException(
            GroupService.GroupValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(
                exception.getMessage(),
                exception.getFieldErrors()
        );
        return ResponseEntity.badRequest().body(response);
    }
}
