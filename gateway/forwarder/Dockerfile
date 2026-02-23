FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY /forwarder/SimpleJavaGateway.java /app/SimpleJavaGateway.java
RUN javac /app/SimpleJavaGateway.java

CMD ["java", "SimpleJavaGateway"]
