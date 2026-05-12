package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.ChatGroupCreateRequest;
import com.example.hovedopgave.dto.ChatDirectConversationRequest;
import com.example.hovedopgave.dto.ChatGroupMemberAddRequest;
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
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class GroupService {

    private static final String OWNER_ROLE = "OWNER";
    private static final String MEMBER_ROLE = "MEMBER";
    private static final String GROUP_TYPE = "CHAT";
    private static final String DIRECT_TYPE = "DIRECT";

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
        List<CommunityGroup> groups = communityGroupRepository.findAllByOrderByCreatedAtDesc();

        List<ChatGroupResponse> directConversations = groups.stream()
                .filter(group -> DIRECT_TYPE.equalsIgnoreCase(group.getType()))
                .filter(group -> isVisibleMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, true, user.getUserId()))
                .toList();

        List<CommunityGroup> chatGroups = groups.stream()
                .filter(group -> GROUP_TYPE.equalsIgnoreCase(group.getType()))
                .toList();

        List<ChatGroupResponse> joinedGroups = chatGroups.stream()
                .filter(group -> isVisibleMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, true, user.getUserId()))
                .toList();

        List<ChatGroupResponse> availableGroups = chatGroups.stream()
                .filter(group -> !isVisibleMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, false, user.getUserId()))
                .toList();

        return new ChatOverviewResponse(directConversations, joinedGroups, availableGroups);
    }

    public List<ChatGroupResponse> getJoinedGroups(Integer userId) {
        User user = getUser(userId);

        return communityGroupRepository.findAllByTypeIgnoreCaseOrderByCreatedAtDesc(GROUP_TYPE).stream()
                .filter(group -> isVisibleMember(group.getGroupId(), user.getUserId()))
                .map(group -> toChatGroupResponse(group, true, user.getUserId()))
                .toList();
    }

    public List<ChatMessageResponse> getMessages(Integer groupId, Integer userId) {
        ensureMembership(groupId, userId);

        return groupMessageRepository.findAllByGroupGroupIdOrderBySentAtAsc(groupId).stream()
                .map(this::toChatMessageResponse)
                .toList();
    }

    public ChatGroupResponse getGroupDetails(Integer groupId, Integer userId) {
        ensureMembership(groupId, userId);
        CommunityGroup group = getGroup(groupId);
        return toChatGroupResponse(group, true, userId);
    }

    @Transactional
    public ChatGroupResponse createGroup(ChatGroupCreateRequest request) {
        Map<String, String> fieldErrors = validateCreateGroupRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new GroupValidationException("Udfyld gruppen korrekt.", fieldErrors);
        }

        User creator = getUser(request.userId());
        List<User> selectedMembers = getRequestedMembers(request.memberUserIds(), creator.getUserId());

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

        for (User selectedMember : selectedMembers) {
            GroupMember membership = new GroupMember();
            membership.setGroup(savedGroup);
            membership.setUser(selectedMember);
            membership.setRoleInGroup(MEMBER_ROLE);
            membership.setJoinedAt(LocalDateTime.now());
            groupMemberRepository.save(membership);
        }

        return toChatGroupResponse(savedGroup, true, creator.getUserId());
    }

    @Transactional
    public ChatGroupResponse createDirectConversation(ChatDirectConversationRequest request) {
        Map<String, String> fieldErrors = validateDirectConversationRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new GroupValidationException("Udfyld samtalen korrekt.", fieldErrors);
        }

        User creator = getUser(request.userId());
        User targetUser = getUser(request.targetUserId());

        CommunityGroup existingConversation = findExistingDirectConversation(creator.getUserId(), targetUser.getUserId());
        if (existingConversation != null) {
            return toChatGroupResponse(existingConversation, true, creator.getUserId());
        }

        CommunityGroup group = new CommunityGroup();
        group.setName(toFullName(targetUser));
        group.setDescription("Direkte samtale");
        group.setType(DIRECT_TYPE);
        group.setCreatedBy(creator);
        group.setCreatedAt(LocalDateTime.now());

        CommunityGroup savedGroup = communityGroupRepository.save(group);

        createMembership(savedGroup, creator, OWNER_ROLE);
        createMembership(savedGroup, targetUser, MEMBER_ROLE);

        return toChatGroupResponse(savedGroup, true, creator.getUserId());
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
            membership.setIsHidden(false);
            membership.setHiddenAt(null);
            groupMemberRepository.save(membership);
        } else {
            GroupMember membership = getMembership(groupId, userId);
            membership.setIsHidden(false);
            membership.setHiddenAt(null);
            groupMemberRepository.save(membership);
        }

        return toChatGroupResponse(group, true, userId);
    }

    @Transactional
    public void leaveGroup(Integer groupId, Integer userId) {
        CommunityGroup group = getGroup(groupId);
        User user = getUser(userId);
        ensureMembership(groupId, user.getUserId());

        if (DIRECT_TYPE.equalsIgnoreCase(group.getType())) {
            throw new GroupValidationException(
                    "Du kan ikke forlade en privat samtale herfra.",
                    Map.of("groupId", "Kun gruppechats kan forlades via gruppeinfo.")
            );
        }

        GroupMember membership = groupMemberRepository.findByGroupGroupIdAndUserUserId(groupId, userId)
                .orElseThrow(() -> new GroupValidationException(
                        "Du er ikke medlem af gruppen.",
                        Map.of("userId", "Der findes ikke et medlemskab for denne bruger.")
                ));

        groupMemberRepository.delete(membership);
    }

    @Transactional
    public void deleteDirectConversationForUser(Integer groupId, Integer userId) {
        CommunityGroup group = getGroup(groupId);
        User user = getUser(userId);
        ensureMembership(groupId, user.getUserId());

        if (!DIRECT_TYPE.equalsIgnoreCase(group.getType())) {
            throw new GroupValidationException(
                    "Kun private samtaler kan slettes herfra.",
                    Map.of("groupId", "Denne handling gælder kun private samtaler.")
            );
        }

        GroupMember membership = getMembership(groupId, userId);
        membership.setIsHidden(true);
        membership.setHiddenAt(LocalDateTime.now());
        groupMemberRepository.save(membership);

        List<GroupMember> memberships = groupMemberRepository.findAllByGroupGroupId(groupId);
        boolean allHidden = memberships.stream().allMatch(existingMembership -> Boolean.TRUE.equals(existingMembership.getIsHidden()));

        if (allHidden) {
            groupMessageRepository.deleteAllByGroupGroupId(groupId);
            groupMemberRepository.deleteAllByGroupGroupId(groupId);
            communityGroupRepository.deleteById(groupId);
            communityGroupRepository.flush();
        }
    }

    @Transactional
    public void deleteGroup(Integer groupId, Integer userId) {
        CommunityGroup group = getGroup(groupId);
        User user = getUser(userId);
        ensureMembership(groupId, user.getUserId());

        if (DIRECT_TYPE.equalsIgnoreCase(group.getType())) {
            throw new GroupValidationException(
                    "Du kan ikke slette en privat samtale herfra.",
                    Map.of("groupId", "Kun gruppechats kan slettes via gruppeinfo.")
            );
        }

        if (group.getCreatedBy() == null || !Objects.equals(group.getCreatedBy().getUserId(), userId)) {
            throw new GroupValidationException(
                    "Du har ikke adgang til at slette gruppen.",
                    Map.of("userId", "Kun gruppeopretteren kan slette gruppen.")
            );
        }

        groupMessageRepository.deleteAllByGroupGroupId(groupId);
        groupMemberRepository.deleteAllByGroupGroupId(groupId);
        communityGroupRepository.deleteById(groupId);
        communityGroupRepository.flush();
    }

    @Transactional
    public ChatGroupResponse addGroupMembers(Integer groupId, ChatGroupMemberAddRequest request) {
        Map<String, String> fieldErrors = validateAddMembersRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new GroupValidationException("Udfyld medlemmerne korrekt.", fieldErrors);
        }

        CommunityGroup group = getGroup(groupId);
        User actingUser = getUser(request.userId());
        ensureMembership(groupId, actingUser.getUserId());

        if (DIRECT_TYPE.equalsIgnoreCase(group.getType())) {
            throw new GroupValidationException(
                    "Du kan ikke tilføje medlemmer til en privat samtale.",
                    Map.of("groupId", "Kun gruppechats kan få nye medlemmer.")
            );
        }

        for (User selectedMember : getRequestedMembers(request.memberUserIds(), null)) {
            if (!isMember(groupId, selectedMember.getUserId())) {
                createMembership(group, selectedMember, MEMBER_ROLE);
            }
        }

        return toChatGroupResponse(group, true, actingUser.getUserId());
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

        if (DIRECT_TYPE.equalsIgnoreCase(group.getType())) {
            List<GroupMember> memberships = groupMemberRepository.findAllByGroupGroupId(groupId);
            for (GroupMember membership : memberships) {
                membership.setIsHidden(false);
                membership.setHiddenAt(null);
                groupMemberRepository.save(membership);
            }
        }

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

        if (request.memberUserIds() != null && request.memberUserIds().stream().anyMatch(Objects::isNull)) {
            fieldErrors.put("memberUserIds", "Alle valgte medlemmer skal have et gyldigt bruger-id.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateDirectConversationRequest(ChatDirectConversationRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (request.targetUserId() == null) {
            fieldErrors.put("targetUserId", "Du skal vaelge en bruger.");
        } else if (request.userId() != null && request.userId().equals(request.targetUserId())) {
            fieldErrors.put("targetUserId", "Du kan ikke oprette en samtale med dig selv.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateAddMembersRequest(ChatGroupMemberAddRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (request.memberUserIds() == null || request.memberUserIds().isEmpty()) {
            fieldErrors.put("memberUserIds", "Vælg mindst ét medlem.");
        } else if (request.memberUserIds().stream().anyMatch(Objects::isNull)) {
            fieldErrors.put("memberUserIds", "Alle valgte medlemmer skal have et gyldigt bruger-id.");
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

    private boolean isVisibleMember(Integer groupId, Integer userId) {
        if (!isMember(groupId, userId)) {
            return false;
        }

        return !Boolean.TRUE.equals(getMembership(groupId, userId).getIsHidden());
    }

    private ChatGroupResponse toChatGroupResponse(CommunityGroup group, boolean joined, Integer currentUserId) {
        long memberCount = groupMemberRepository.countByGroupGroupId(group.getGroupId());
        GroupMessage lastMessage = groupMessageRepository.findTopByGroupGroupIdOrderBySentAtDesc(group.getGroupId())
                .orElse(null);
        boolean isDirectConversation = DIRECT_TYPE.equalsIgnoreCase(group.getType());
        User counterpart = isDirectConversation ? findCounterpart(group.getGroupId(), currentUserId) : null;

        String createdByName = group.getCreatedBy() == null
                ? "Ukendt"
                : toFullName(group.getCreatedBy());

        return new ChatGroupResponse(
                group.getGroupId(),
                isDirectConversation && counterpart != null ? toFullName(counterpart) : group.getName(),
                isDirectConversation && counterpart != null ? toRoleLabel(counterpart.getRole()) : group.getDescription(),
                group.getType(),
                isDirectConversation && counterpart != null ? counterpart.getUserId() : null,
                (int) memberCount,
                joined,
                group.getCreatedBy() != null ? group.getCreatedBy().getUserId() : null,
                createdByName,
                lastMessage != null ? lastMessage.getMessage() : null,
                lastMessage != null && lastMessage.getSentAt() != null ? lastMessage.getSentAt().toString() : null
        );
    }

    private List<User> getRequestedMembers(List<Integer> memberUserIds, Integer creatorUserId) {
        if (memberUserIds == null || memberUserIds.isEmpty()) {
            return List.of();
        }

        Set<Integer> uniqueUserIds = new LinkedHashSet<>(memberUserIds);
        if (creatorUserId != null) {
            uniqueUserIds.remove(creatorUserId);
        }

        return uniqueUserIds.stream()
                .map(this::getUser)
                .toList();
    }

    private GroupMember getMembership(Integer groupId, Integer userId) {
        return groupMemberRepository.findByGroupGroupIdAndUserUserId(groupId, userId)
                .orElseThrow(() -> new GroupValidationException(
                        "Du er ikke medlem af gruppen.",
                        Map.of("userId", "Der findes ikke et medlemskab for denne bruger.")
                ));
    }

    private CommunityGroup findExistingDirectConversation(Integer userId, Integer targetUserId) {
        return groupMemberRepository.findAllByUserUserIdOrderByJoinedAtDesc(userId).stream()
                .map(GroupMember::getGroup)
                .filter(Objects::nonNull)
                .filter(group -> DIRECT_TYPE.equalsIgnoreCase(group.getType()))
                .filter(group -> hasDirectParticipants(group.getGroupId(), userId, targetUserId))
                .findFirst()
                .orElse(null);
    }

    private boolean hasDirectParticipants(Integer groupId, Integer userId, Integer targetUserId) {
        List<GroupMember> memberships = groupMemberRepository.findAllByGroupGroupIdOrderByJoinedAtAsc(groupId);
        if (memberships.size() != 2) {
            return false;
        }

        Set<Integer> participantIds = memberships.stream()
                .map(GroupMember::getUser)
                .filter(Objects::nonNull)
                .map(User::getUserId)
                .collect(java.util.stream.Collectors.toSet());

        return participantIds.contains(userId) && participantIds.contains(targetUserId);
    }

    private User findCounterpart(Integer groupId, Integer currentUserId) {
        return groupMemberRepository.findAllByGroupGroupIdOrderByJoinedAtAsc(groupId).stream()
                .map(GroupMember::getUser)
                .filter(Objects::nonNull)
                .filter(user -> !Objects.equals(user.getUserId(), currentUserId))
                .findFirst()
                .orElse(null);
    }

    private void createMembership(CommunityGroup group, User user, String role) {
        GroupMember membership = new GroupMember();
        membership.setGroup(group);
        membership.setUser(user);
        membership.setRoleInGroup(role);
        membership.setJoinedAt(LocalDateTime.now());
        membership.setIsHidden(false);
        membership.setHiddenAt(null);
        groupMemberRepository.save(membership);
    }

    private String toFullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private String toRoleLabel(String role) {
        if (role == null) {
            return "Beboer";
        }

        return "ADMIN".equalsIgnoreCase(role) ? "Administrator" : "Beboer";
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
