package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.ChatGroupCreateRequest;
import com.example.hovedopgave.dto.ChatGroupResponse;
import com.example.hovedopgave.dto.ChatMessageRequest;
import com.example.hovedopgave.dto.ChatMessageResponse;
import com.example.hovedopgave.dto.ChatOverviewResponse;
import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.model.GroupMember;
import com.example.hovedopgave.model.GroupMessage;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.CommunityGroupRepository;
import com.example.hovedopgave.repository.GroupMemberRepository;
import com.example.hovedopgave.repository.GroupMessageRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroupService {

    private static final String OWNER_ROLE = "OWNER";
    private static final String MEMBER_ROLE = "MEMBER";
    private static final String GROUP_TYPE = "CHAT";

    private final CommunityGroupRepository communityGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final UserRepository userRepository;

    public GroupService(
            CommunityGroupRepository communityGroupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupMessageRepository groupMessageRepository,
            UserRepository userRepository
    ) {
        this.communityGroupRepository = communityGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.userRepository = userRepository;
    }

    public ChatOverviewResponse getChatOverview(Integer userId) {
        User user = getUser(userId);
        List<CommunityGroup> groups = communityGroupRepository.findAllByTypeIgnoreCaseOrderByCreatedAtDesc(GROUP_TYPE);

        List<ChatGroupResponse> joinedGroups = groups.stream()
                .filter(group -> isMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, true))
                .toList();

        List<ChatGroupResponse> availableGroups = groups.stream()
                .filter(group -> !isMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, false))
                .toList();

        return new ChatOverviewResponse(joinedGroups, availableGroups);
    }

    public List<ChatGroupResponse> getJoinedGroups(Integer userId) {
        User user = getUser(userId);

        return communityGroupRepository.findAllByTypeIgnoreCaseOrderByCreatedAtDesc(GROUP_TYPE).stream()
                .filter(group -> isMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, true))
                .toList();
    }

    public List<ChatMessageResponse> getMessages(Integer groupId, Integer userId) {
        ensureMembership(groupId, userId);

        return groupMessageRepository.findAllByGroupGroupIdOrderBySentAtAsc(groupId).stream()
                .map(this::toChatMessageResponse)
                .toList();
    }

    @Transactional
    public ChatGroupResponse createGroup(ChatGroupCreateRequest request) {
        Map<String, String> fieldErrors = validateCreateGroupRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new GroupValidationException("Udfyld gruppen korrekt.", fieldErrors);
        }

        User creator = getUser(request.userId());

        if (!"ADMIN".equalsIgnoreCase(creator.getRole())) {
            throw new GroupValidationException(
                    "Du har ikke adgang til at oprette grupper.",
                    Map.of("userId", "Kun administratorer kan oprette grupper.")
            );
        }

        CommunityGroup group = new CommunityGroup();
        group.setName(request.name().trim());
        group.setDescription(request.description().trim());
        group.setType(GROUP_TYPE);
        group.setCreatedBy(creator);
        group.setCreatedAt(LocalDateTime.now());

        CommunityGroup savedGroup = communityGroupRepository.save(group);

        GroupMember ownerMembership = new GroupMember();
        ownerMembership.setGroup(savedGroup);
        ownerMembership.setUser(creator);
        ownerMembership.setRoleInGroup(OWNER_ROLE);
        ownerMembership.setJoinedAt(LocalDateTime.now());
        groupMemberRepository.save(ownerMembership);

        return toChatGroupResponse(savedGroup, true);
    }

    @Transactional
    public ChatGroupResponse joinGroup(Integer groupId, Integer userId) {
        CommunityGroup group = getGroup(groupId);
        User user = getUser(userId);

        if (!isMember(groupId, userId)) {
            GroupMember membership = new GroupMember();
            membership.setGroup(group);
            membership.setUser(user);
            membership.setRoleInGroup(MEMBER_ROLE);
            membership.setJoinedAt(LocalDateTime.now());
            groupMemberRepository.save(membership);
        }

        return toChatGroupResponse(group, true);
    }

    @Transactional
    public ChatMessageResponse saveMessage(Integer groupId, ChatMessageRequest request) {
        Map<String, String> fieldErrors = validateMessageRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new GroupValidationException("Udfyld beskeden korrekt.", fieldErrors);
        }

        CommunityGroup group = getGroup(groupId);
        User user = getUser(request.userId());
        ensureMembership(groupId, user.getUserId());

        GroupMessage message = new GroupMessage();
        message.setGroup(group);
        message.setUser(user);
        message.setMessage(request.message().trim());
        message.setSentAt(LocalDateTime.now());

        GroupMessage savedMessage = groupMessageRepository.save(message);
        return toChatMessageResponse(savedMessage);
    }

    private Map<String, String> validateCreateGroupRequest(ChatGroupCreateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        String name = normalize(request.name());
        String description = normalize(request.description());

        if (name == null) {
            fieldErrors.put("name", "Gruppenavn er obligatorisk.");
        } else if (name.length() > 80) {
            fieldErrors.put("name", "Gruppenavn maa hoejst vaere 80 tegn.");
        }

        if (description == null) {
            fieldErrors.put("description", "Beskrivelse er obligatorisk.");
        } else if (description.length() > 250) {
            fieldErrors.put("description", "Beskrivelsen maa hoejst vaere 250 tegn.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateMessageRequest(ChatMessageRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        String message = normalize(request.message());
        if (message == null) {
            fieldErrors.put("message", "Beskeden er obligatorisk.");
        } else if (message.length() > 1000) {
            fieldErrors.put("message", "Beskeden maa hoejst vaere 1000 tegn.");
        }

        return fieldErrors;
    }

    private CommunityGroup getGroup(Integer groupId) {
        return communityGroupRepository.findById(groupId)
                .orElseThrow(() -> new GroupValidationException(
                        "Gruppen findes ikke.",
                        Map.of("groupId", "Der findes ingen gruppe med dette id.")
                ));
    }

    private User getUser(Integer userId) {
        if (userId == null) {
            throw new GroupValidationException(
                    "Brugeren findes ikke.",
                    Map.of("userId", "Bruger-id er obligatorisk.")
            );
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new GroupValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));
    }

    private void ensureMembership(Integer groupId, Integer userId) {
        if (!isMember(groupId, userId)) {
            throw new GroupValidationException(
                    "Du har ikke adgang til denne gruppe.",
                    Map.of("userId", "Kun medlemmer kan tilgaa og skrive i gruppen.")
            );
        }
    }

    private boolean isMember(Integer groupId, Integer userId) {
        return groupId != null
                && userId != null
                && groupMemberRepository.existsByGroupGroupIdAndUserUserId(groupId, userId);
    }

    private ChatGroupResponse toChatGroupResponse(CommunityGroup group, boolean joined) {
        long memberCount = groupMemberRepository.countByGroupGroupId(group.getGroupId());
        GroupMessage lastMessage = groupMessageRepository.findTopByGroupGroupIdOrderBySentAtDesc(group.getGroupId())
                .orElse(null);

        String createdByName = group.getCreatedBy() == null
                ? "Ukendt"
                : group.getCreatedBy().getFirstName() + " " + group.getCreatedBy().getLastName();

        return new ChatGroupResponse(
                group.getGroupId(),
                group.getName(),
                group.getDescription(),
                (int) memberCount,
                joined,
                group.getCreatedBy() != null ? group.getCreatedBy().getUserId() : null,
                createdByName,
                lastMessage != null ? lastMessage.getMessage() : null,
                lastMessage != null && lastMessage.getSentAt() != null ? lastMessage.getSentAt().toString() : null
        );
    }

    private ChatMessageResponse toChatMessageResponse(GroupMessage message) {
        String authorName = message.getUser() == null
                ? "Ukendt bruger"
                : message.getUser().getFirstName() + " " + message.getUser().getLastName();

        return new ChatMessageResponse(
                message.getMessageId(),
                message.getGroup() != null ? message.getGroup().getGroupId() : null,
                message.getUser() != null ? message.getUser().getUserId() : null,
                authorName,
                message.getMessage(),
                message.getSentAt() != null ? message.getSentAt().toString() : null
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    public static class GroupValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public GroupValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
